import type { CCRCalendarState, CTeamKey } from '../types/ccr.js';
import { C_TEAM_KEYS } from '../constants/defaults.js';
import { buildBaseRotation } from '../logic/buildBaseRotation.js';
import { getMonthStartWithNight } from '../logic/generateMonthSchedule.js';
import { toMonthKey } from '../utils/date.js';
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
  const monthKey = toMonthKey(state.selectedYear, state.selectedMonthIndex);
  const currentStartWithNight = getMonthStartWithNight(
    state,
    state.selectedYear,
    state.selectedMonthIndex,
  );

  return (
    <section className="no-print mx-auto grid max-w-[1480px] gap-3 px-4 py-3">
      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
          <div className="hidden text-xs font-bold text-slate-500 lg:block">
            월간/연간 보기
          </div>
          <div className="grid w-full grid-cols-[92px_minmax(150px,auto)_92px] items-center justify-center gap-2 sm:flex sm:w-auto sm:gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onPreviousMonth}
            aria-label="이전 달"
            className="w-full min-w-0 px-2 text-sm sm:w-24"
          >
            ◀ 이전
          </Button>
          <button
            type="button"
            className="min-h-11 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 text-center text-lg font-black text-slate-950 transition hover:bg-slate-100 sm:min-w-48 sm:px-6 sm:text-xl"
            onClick={onToggleView}
          >
            {state.selectedYear}년 {state.selectedMonthIndex + 1}월
          </button>
          <Button
            type="button"
            variant="secondary"
            onClick={onNextMonth}
            aria-label="다음 달"
            className="w-full min-w-0 px-2 text-sm sm:w-24"
          >
            다음 ▶
          </Button>
          </div>
          <div className="hidden justify-self-end text-xs font-bold text-slate-500 lg:block">
            기준 설정
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
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
              variant={currentStartWithNight ? 'primary' : 'secondary'}
              onClick={() => {
                const nextStartWithNight = !currentStartWithNight;
                onChange({
                  ...state,
                  startWithNight: nextStartWithNight,
                  monthStartWithNight: {
                    ...state.monthStartWithNight,
                    [monthKey]: nextStartWithNight,
                  },
                });
              }}
            >
              {currentStartWithNight ? '🌙 야간' : '☀ 주간'}
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
