import { useState, type ChangeEvent } from 'react';
import type { CCRCalendarState } from '../types/ccr.js';
import { DEFAULT_STATE } from '../constants/defaults.js';
import {
  buildShareUrl,
  createServerSave,
  getInitialSaveKeyFromUrl,
  loadServerSave,
  updateServerSave,
} from '../logic/serverSaveClient.js';
import { clearStoredState, exportBackup, parseBackupFile } from '../logic/storage.js';
import { Button, Input, Modal } from './ui.js';

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
  const [serverSaveKey, setServerSaveKey] = useState(
    state.serverSave.saveKey || getInitialSaveKeyFromUrl(),
  );
  const [serverPin, setServerPin] = useState('');
  const [serverStatus, setServerStatus] = useState('');
  const [serverBusy, setServerBusy] = useState(false);

  const activeSaveKey = serverSaveKey || state.serverSave.saveKey;
  const lastServerSaveTime = state.serverSave.updatedAt || '';

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

  async function copyText(value: string, successMessage: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setServerStatus(successMessage);
  }

  async function runServerAction(action: () => Promise<void>) {
    setServerBusy(true);
    try {
      await action();
    } catch (error) {
      setServerStatus(error instanceof Error ? error.message : '서버 저장 처리에 실패했습니다.');
    } finally {
      setServerBusy(false);
    }
  }

  function stateWithServerSave(
    saveKey: string,
    updatedAt: string,
    revision: number,
    baseState = state,
  ) {
    return {
      ...baseState,
      serverSave: {
        saveKey,
        updatedAt,
        revision,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  async function handleCreateServerSave() {
    await runServerAction(async () => {
      if (!serverPin) {
        const confirmed = window.confirm(
          'PIN 없이 서버 저장을 만들면 저장키나 공유 링크를 아는 사람이 근무표를 볼 수 있고 수정도 할 수 있습니다.\n\n그래도 PIN 없이 만들까요?',
        );
        if (!confirmed) {
          setServerStatus('PIN을 입력한 뒤 서버 저장을 만들어주세요. 6자리 이상을 권장합니다.');
          return;
        }
      } else if (serverPin.length < 6) {
        const confirmed = window.confirm(
          'PIN은 6자리 이상을 권장합니다. 짧은 PIN은 공유 링크가 노출됐을 때 추측될 위험이 더 큽니다.\n\n이 PIN으로 계속할까요?',
        );
        if (!confirmed) {
          setServerStatus('6자리 이상 PIN을 권장합니다.');
          return;
        }
      }
      setServerStatus('서버 저장키 생성 중');
      const result = await createServerSave(state, serverPin);
      setServerSaveKey(result.saveKey);
      onChange(stateWithServerSave(result.saveKey, result.updatedAt, result.revision));
      setServerStatus(`서버 저장 생성 완료 · ${result.saveKey}`);
    });
  }

  async function handleLoadServerSave() {
    await runServerAction(async () => {
      if (!activeSaveKey) {
        setServerStatus('저장키를 입력해주세요.');
        return;
      }
      const confirmed = window.confirm(
        '서버 근무표를 불러오면 현재 브라우저의 근무표가 서버 데이터로 바뀝니다.\n\n계속 불러올까요?',
      );
      if (!confirmed) {
        setServerStatus('서버 불러오기를 취소했습니다.');
        return;
      }
      setServerStatus('서버에서 근무표 불러오는 중');
      const result = await loadServerSave(activeSaveKey, serverPin);
      setServerSaveKey(result.saveKey);
      onChange(stateWithServerSave(result.saveKey, result.updatedAt, result.revision, result.state));
      setServerStatus('서버 근무표를 불러왔고 브라우저 로컬에도 저장됩니다.');
    });
  }

  async function handleUpdateServerSave() {
    await runServerAction(async () => {
      if (!activeSaveKey) {
        setServerStatus('저장키를 입력하거나 먼저 서버 저장을 만들어주세요.');
        return;
      }
      setServerStatus('현재 근무표 서버 저장 중');
      const result = await updateServerSave(activeSaveKey, state, serverPin);
      setServerSaveKey(result.saveKey);
      onChange(stateWithServerSave(result.saveKey, result.updatedAt, result.revision));
      setServerStatus('현재 근무표를 서버에 저장했습니다.');
    });
  }

  return (
    <Modal title="백업/복원" onClose={onClose} width="max-w-2xl">
      <div className="grid gap-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          <p className="font-black">로그인 없이 저장키로 서버에 저장합니다. 저장키를 잃어버리면 복구할 수 없습니다.</p>
          <p>중요한 근무표는 JSON 백업도 함께 저장해 주세요.</p>
          <p>공유 링크를 아는 사람은 근무표를 볼 수 있고, PIN이 없으면 수정도 할 수 있습니다.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-950">서버 저장</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Vercel + Neon에 수동 저장합니다. 브라우저 로컬 자동저장은 그대로 유지됩니다.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                activeSaveKey
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {activeSaveKey ? '저장키 있음' : '저장키 없음'}
            </span>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              <span>저장키</span>
              <Input
                value={serverSaveKey}
                placeholder="ccr_xxxxxxxxxxxxxxxx"
                onChange={(event) => setServerSaveKey(event.target.value.trim())}
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              <span>선택 PIN</span>
              <Input
                value={serverPin}
                type="password"
                inputMode="numeric"
                placeholder="6자리 이상 권장"
                onChange={(event) => setServerPin(event.target.value)}
              />
            </label>

            <div className="grid gap-2 md:grid-cols-3">
              <Button type="button" onClick={handleCreateServerSave} disabled={serverBusy}>
                서버 저장 만들기
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleUpdateServerSave}
                disabled={serverBusy}
              >
                현재 상태 저장
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleLoadServerSave}
                disabled={serverBusy}
              >
                저장키로 불러오기
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => copyText(activeSaveKey, '저장키를 복사했습니다.')}
                disabled={!activeSaveKey || serverBusy}
              >
                저장키 복사
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => copyText(buildShareUrl(activeSaveKey), '공유 링크를 복사했습니다.')}
                disabled={!activeSaveKey || serverBusy}
              >
                공유 링크 복사
              </Button>
            </div>
          </div>

          <dl className="mt-3 grid gap-2 text-xs font-semibold text-slate-600">
            <div className="flex justify-between gap-3">
              <dt>마지막 서버 저장</dt>
              <dd>{lastServerSaveTime || '없음'}</dd>
            </div>
          </dl>
          <p className="mt-3 break-words text-xs font-bold leading-5 text-slate-600">
            {serverStatus || '서버 저장은 자동 실행되지 않습니다. 실패해도 브라우저 로컬 저장은 유지됩니다.'}
          </p>
        </div>

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
