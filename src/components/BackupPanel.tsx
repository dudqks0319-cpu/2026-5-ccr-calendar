import type { ChangeEvent } from 'react';
import type { CCRCalendarState } from '../types/ccr.js';
import { DEFAULT_STATE } from '../constants/defaults.js';
import { clearStoredState, exportBackup, parseBackupFile } from '../logic/storage.js';
import { Button, Modal } from './ui.js';

type BackupPanelProps = {
  state: CCRCalendarState;
  onChange: (state: CCRCalendarState) => void;
  onClose: () => void;
};

export function BackupPanel({ state, onChange, onClose }: BackupPanelProps) {
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
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          로컬 저장은 현재 브라우저에만 보관됩니다. PC 교체, 브라우저 삭제, 시크릿 모드에서는 데이터가 사라질 수 있으므로 JSON 백업을 같이 사용하세요.
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
