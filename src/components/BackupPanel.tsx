import type { ChangeEvent } from 'react';
import type { CCRCalendarState } from '../types/ccr.js';
import { DEFAULT_STATE } from '../constants/defaults.js';
import { clearStoredState, exportBackup, parseBackupFile } from '../logic/storage.js';
import { Button, Modal } from './ui.js';

type BackupPanelProps = {
  state: CCRCalendarState;
  onChange: (state: CCRCalendarState) => void;
  onClose: () => void;
  fileSaveName: string;
  fileSaveStatus: string;
  filePersistenceSupported: boolean;
  onCreateLocalSaveFile: () => void;
  onOpenLocalSaveFile: () => void;
  onSaveLocalFileNow: () => void;
};

export function BackupPanel({
  state,
  onChange,
  onClose,
  fileSaveName,
  fileSaveStatus,
  filePersistenceSupported,
  onCreateLocalSaveFile,
  onOpenLocalSaveFile,
  onSaveLocalFileNow,
}: BackupPanelProps) {
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const nextState = await parseBackupFile(file);
      onChange(nextState);
      event.target.value = '';
    } catch (error) {
      alert(error instanceof Error ? error.message : '백업 파일을 불러오지 못했습니다.');
    }
  }

  return (
    <Modal title="백업/복원" onClose={onClose} width="max-w-2xl">
      <div className="grid gap-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          브라우저 데이터가 자동 삭제되는 PC에서는 localStorage가 지워질 수 있습니다. 아래
          로컬 저장 파일을 연결하면 변경 내역이 지정한 JSON 파일에도 같이 저장됩니다.
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-950">로컬 파일 자동저장</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                서버 없이 이 PC의 JSON 파일에 직접 저장합니다.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                fileSaveName
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {fileSaveName ? '파일 연결됨' : '파일 미연결'}
            </span>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <Button
              type="button"
              onClick={onCreateLocalSaveFile}
              disabled={!filePersistenceSupported}
            >
              저장 파일 만들기
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onOpenLocalSaveFile}
              disabled={!filePersistenceSupported}
            >
              저장 파일 열기
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveLocalFileNow}
              disabled={!filePersistenceSupported}
            >
              지금 파일 저장
            </Button>
          </div>

          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            {filePersistenceSupported
              ? fileSaveStatus || 'Chrome/Edge에서 지원됩니다. 캐시가 지워진 뒤에는 저장 파일 열기로 같은 JSON 파일을 다시 선택하세요.'
              : '이 브라우저는 직접 파일 저장을 지원하지 않습니다. Chrome 또는 Edge에서 열어주세요.'}
          </p>
          {fileSaveName ? (
            <p className="mt-1 break-all text-xs font-bold text-slate-700">{fileSaveName}</p>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Button type="button" onClick={() => exportBackup(state)}>
            JSON 백업 내보내기
          </Button>

          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
            JSON 백업 불러오기
            <input className="sr-only" type="file" accept="application/json,.json" onChange={handleFile} />
          </label>

          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (confirm('전체 데이터를 초기화할까요? 이 작업은 되돌릴 수 없습니다. 먼저 JSON 백업을 권장합니다.')) {
                clearStoredState();
                onChange({
                  ...structuredClone(DEFAULT_STATE),
                  updatedAt: new Date().toISOString(),
                });
              }
            }}
          >
            전체 초기화
          </Button>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-2 text-sm font-black text-slate-950">저장 상태</h3>
          <dl className="grid gap-2 text-sm text-slate-700">
            <div className="flex justify-between gap-3">
              <dt className="font-bold">버전</dt>
              <dd>{state.version}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-bold">마지막 변경</dt>
              <dd>{state.updatedAt}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-bold">선택 월</dt>
              <dd>
                {state.selectedYear}년 {state.selectedMonthIndex + 1}월
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Modal>
  );
}
