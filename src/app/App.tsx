import { useEffect, useMemo, useState } from 'react';
import { BackupPanel } from '../components/BackupPanel.js';
import { CalendarControls } from '../components/CalendarControls.js';
import { DayEditModal } from '../components/DayEditModal.js';
import { Header } from '../components/Header.js';
import { MonthCalendar } from '../components/MonthCalendar.js';
import { SettingsModal } from '../components/SettingsModal.js';
import { StatsModal } from '../components/StatsModal.js';
import { YearCalendar } from '../components/YearCalendar.js';
import { exportScheduleToExcel } from '../logic/exportExcel.js';
import { exportElementToPdf } from '../logic/exportPdf.js';
import {
  createLocalSaveFile,
  openLocalSaveFile,
  supportsLocalFilePersistence,
  writeStateToFileHandle,
  type CCRFileHandle,
} from '../logic/filePersistence.js';
import { generateMonthSchedule } from '../logic/generateMonthSchedule.js';
import { saveState, loadState } from '../logic/storage.js';
import { calculateWorkerStats } from '../logic/stats.js';
import type { CalendarDay, CCRCalendarState } from '../types/ccr.js';

type OpenModal = 'settings' | 'stats' | 'backup' | null;

function withUpdatedAt(state: CCRCalendarState): CCRCalendarState {
  return {
    ...state,
    updatedAt: new Date().toISOString(),
  };
}

export default function App() {
  const [state, setState] = useState<CCRCalendarState>(() => loadState());
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [autosaveStatus, setAutosaveStatus] = useState('브라우저 로컬 자동저장 준비');
  const [fileSaveHandle, setFileSaveHandle] = useState<CCRFileHandle | null>(null);
  const [fileSaveStatus, setFileSaveStatus] = useState('');

  const schedule = useMemo(
    () => generateMonthSchedule(state, state.selectedYear, state.selectedMonthIndex),
    [state],
  );
  const stats = useMemo(() => calculateWorkerStats(state, schedule), [state, schedule]);

  function applyState(nextState: CCRCalendarState) {
    setState(withUpdatedAt(nextState));
  }

  useEffect(() => {
    try {
      saveState(state);
      setAutosaveStatus(`브라우저 저장 완료 · ${new Date(state.updatedAt).toLocaleString('ko-KR')}`);
    } catch {
      setAutosaveStatus('자동 저장 실패 · 브라우저 저장 공간을 확인하세요');
    }

    if (!fileSaveHandle) return;

    let cancelled = false;
    setFileSaveStatus(`파일 저장 중 · ${fileSaveHandle.name}`);
    writeStateToFileHandle(fileSaveHandle, state)
      .then(() => {
        if (!cancelled) {
          setFileSaveStatus(`파일 저장 완료 · ${fileSaveHandle.name}`);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setFileSaveStatus(
            error instanceof Error
              ? `파일 저장 실패 · ${error.message}`
              : '파일 저장 실패',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state]);

  async function handleCreateLocalSaveFile() {
    try {
      setFileSaveStatus('로컬 저장 파일 만드는 중');
      const handle = await createLocalSaveFile(state);
      setFileSaveHandle(handle);
      setFileSaveStatus(`파일 저장 연결됨 · ${handle.name}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setFileSaveStatus('로컬 저장 파일 선택 취소');
        return;
      }
      setFileSaveStatus(error instanceof Error ? error.message : '로컬 저장 파일 생성 실패');
    }
  }

  async function handleOpenLocalSaveFile() {
    try {
      setFileSaveStatus('로컬 저장 파일 여는 중');
      const { handle, state: nextState } = await openLocalSaveFile();
      setFileSaveHandle(handle);
      applyState(nextState);
      setFileSaveStatus(`파일 저장 연결됨 · ${handle.name}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setFileSaveStatus('로컬 저장 파일 선택 취소');
        return;
      }
      setFileSaveStatus(error instanceof Error ? error.message : '로컬 저장 파일 불러오기 실패');
    }
  }

  async function handleSaveLocalFileNow() {
    if (!fileSaveHandle) {
      await handleCreateLocalSaveFile();
      return;
    }

    try {
      setFileSaveStatus(`파일 저장 중 · ${fileSaveHandle.name}`);
      await writeStateToFileHandle(fileSaveHandle, state);
      setFileSaveStatus(`파일 저장 완료 · ${fileSaveHandle.name}`);
    } catch (error) {
      setFileSaveStatus(error instanceof Error ? error.message : '로컬 파일 저장 실패');
    }
  }

  function previousMonth() {
    const nextMonth = state.selectedMonthIndex - 1;
    applyState({
      ...state,
      selectedYear: nextMonth < 0 ? state.selectedYear - 1 : state.selectedYear,
      selectedMonthIndex: nextMonth < 0 ? 11 : nextMonth,
    });
  }

  function nextMonth() {
    const nextMonth = state.selectedMonthIndex + 1;
    applyState({
      ...state,
      selectedYear: nextMonth > 11 ? state.selectedYear + 1 : state.selectedYear,
      selectedMonthIndex: nextMonth > 11 ? 0 : nextMonth,
    });
  }

  async function handleExportPdf() {
    const element = document.getElementById('print-area');
    if (!element) return;
    setAutosaveStatus('PDF 생성 중');
    try {
      await exportElementToPdf(
        element,
        `CCR근무표_${state.selectedYear}_${state.selectedMonthIndex + 1}월.pdf`,
        state.ui.pdfScale,
      );
      setAutosaveStatus('PDF 저장 완료');
    } catch (error) {
      console.error('PDF export failed', error);
      setAutosaveStatus(
        error instanceof Error ? `PDF 저장 실패 · ${error.message}` : 'PDF 저장 실패',
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <Header
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onOpenStats={() => setOpenModal('stats')}
        onOpenSettings={() => setOpenModal('settings')}
        onOpenBackup={() => setOpenModal('backup')}
        onExportPdf={handleExportPdf}
        onExportExcel={() => exportScheduleToExcel(schedule)}
        onPrint={() => window.print()}
        autosaveStatus={fileSaveStatus ? `${autosaveStatus} · ${fileSaveStatus}` : autosaveStatus}
      />

      <CalendarControls
        state={state}
        onChange={applyState}
        onPreviousMonth={previousMonth}
        onNextMonth={nextMonth}
        onToggleView={() =>
          applyState({
            ...state,
            ui: {
              ...state.ui,
              viewMode: state.ui.viewMode === 'month' ? 'year' : 'month',
            },
          })
        }
      />

      <main className="pb-8">
        {state.ui.viewMode === 'month' ? (
          <div className="overflow-x-auto px-4 pb-3">
            <MonthCalendar
              state={state}
              schedule={schedule}
              searchTerm={searchTerm}
              onDayClick={setSelectedDay}
              onChange={applyState}
            />
          </div>
        ) : (
          <YearCalendar
            state={state}
            onSelectMonth={(monthIndex) =>
              applyState({
                ...state,
                selectedMonthIndex: monthIndex,
                ui: {
                  ...state.ui,
                  viewMode: 'month',
                },
              })
            }
          />
        )}
      </main>

      {selectedDay ? (
        <DayEditModal
          day={selectedDay}
          state={state}
          onChange={applyState}
          onClose={() => setSelectedDay(null)}
        />
      ) : null}

      {openModal === 'settings' ? (
        <SettingsModal state={state} onChange={applyState} onClose={() => setOpenModal(null)} />
      ) : null}

      {openModal === 'stats' ? (
        <StatsModal
          title={`${state.selectedYear}년 ${state.selectedMonthIndex + 1}월 근무자 통계`}
          stats={stats}
          onClose={() => setOpenModal(null)}
        />
      ) : null}

      {openModal === 'backup' ? (
        <BackupPanel
          state={state}
          onChange={applyState}
          onClose={() => setOpenModal(null)}
          fileSaveName={fileSaveHandle?.name ?? ''}
          fileSaveStatus={fileSaveStatus}
          filePersistenceSupported={supportsLocalFilePersistence()}
          onCreateLocalSaveFile={handleCreateLocalSaveFile}
          onOpenLocalSaveFile={handleOpenLocalSaveFile}
          onSaveLocalFileNow={handleSaveLocalFileNow}
        />
      ) : null}
    </div>
  );
}
