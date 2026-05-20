import type { CCRCalendarState, CTeamKey } from '../types/ccr.js';
import { C_TEAM_KEYS } from '../constants/defaults.js';
import { buildBaseRotation } from '../logic/buildBaseRotation.js';
import { Button, Field, Select } from './ui.js';

type CalendarControlsProps = {
  state: CCRCalendarState;
  onChange: (state: CCRCalendarState) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToggleView: () => void;
};

export function CalendarControls({
  state,
  onChange,
  onPreviousMonth,
  onNextMonth,
  onToggleView,
}: CalendarControlsProps) {
  const allWorkers = buildBaseRotation(state.dayTeams);
  const years = Array.from({ length: 11 }, (_, index) => state.selectedYear - 5 + index);

  return (
    <section className="no-print mx-auto grid max-w-[1480px] gap-3 px-4 py-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="grid w-full grid-cols-[78px_1fr_78px] items-center gap-2 lg:w-auto lg:grid-cols-[auto_auto_auto]">
          <Button
            type="button"
            variant="secondary"
            onClick={onPreviousMonth}
            aria-label="이전 달"
            className="w-full min-w-0 px-1 text-xs"
          >
            ◀ 이전
          </Button>
          <button
            type="button"
            className="min-h-10 min-w-0 rounded-md px-1 text-center text-base font-black text-slate-950 transition hover:bg-slate-100 lg:px-4 lg:text-xl"
            onClick={onToggleView}
          >
            {state.selectedYear}년 {state.selectedMonthIndex + 1}월
          </button>
          <Button
            type="button"
            variant="secondary"
            onClick={onNextMonth}
            aria-label="다음 달"
            className="w-full min-w-0 px-1 text-xs"
          >
            다음 ▶
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
          <Field label="연도">
            <Select
              value={state.selectedYear}
              onChange={(event) =>
                onChange({
                  ...state,
                  selectedYear: Number(event.target.value),
                })
              }
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </Select>
          </Field>

          <Field label="월">
            <Select
              value={state.selectedMonthIndex}
              onChange={(event) =>
                onChange({
                  ...state,
                  selectedMonthIndex: Number(event.target.value),
                })
              }
            >
              {Array.from({ length: 12 }, (_, monthIndex) => (
                <option key={monthIndex} value={monthIndex}>
                  {monthIndex + 1}월
                </option>
              ))}
            </Select>
          </Field>

          <Field label="C조">
            <Select
              value={state.selectedCTeamKey}
              onChange={(event) =>
                onChange({
                  ...state,
                  selectedCTeamKey: event.target.value as CTeamKey,
                })
              }
            >
              {C_TEAM_KEYS.map((key) => (
                <option key={key} value={key}>
                  {state.cTeams[key].label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="시작">
            <Button
              type="button"
              variant={state.startWithNight ? 'primary' : 'secondary'}
              onClick={() =>
                onChange({
                  ...state,
                  startWithNight: !state.startWithNight,
                })
              }
            >
              {state.startWithNight ? '🌙 야간' : '☀ 주간'}
            </Button>
          </Field>

          <Field label="자재담당">
            <Select
              value={state.materialRule.fixedWorkerName}
              onChange={(event) =>
                onChange({
                  ...state,
                  materialRule: {
                    ...state.materialRule,
                    fixedWorkerName: event.target.value,
                    mode: 'fixed',
                  },
                })
              }
            >
              <option value="">미지정</option>
              {allWorkers.map((workerName) => (
                <option key={workerName} value={workerName}>
                  {workerName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="PDF 배율">
            <Select
              value={state.ui.pdfScale}
              onChange={(event) =>
                onChange({
                  ...state,
                  ui: {
                    ...state.ui,
                    pdfScale: Number(event.target.value),
                  },
                })
              }
            >
              {[80, 90, 95, 100, 110, 120].map((scale) => (
                <option key={scale} value={scale}>
                  {scale}%
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </section>
  );
}
