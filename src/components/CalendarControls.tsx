import type { CCRCalendarState, CTeamKey } from '../types/ccr.js';
import { C_TEAM_KEYS } from '../constants/defaults.js';
import { buildBaseRotation } from '../logic/buildBaseRotation.js';
import { getMonthCTeamKey, getMonthStartWithNight } from '../logic/generateMonthSchedule.js';
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
  const currentMonthCTeamKey = getMonthCTeamKey(state, state.selectedYear, state.selectedMonthIndex);
  const currentStartWithNight = getMonthStartWithNight(
    state,
    state.selectedYear,
    state.selectedMonthIndex,
  );

  function renderQuickFields(className: string) {
    return (
      <div className={className}>
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
            value={currentMonthCTeamKey || ''}
            onChange={(event) =>
              onChange({
                ...state,
                selectedCTeamKey: event.target.value as CTeamKey,
                monthCTeamKeys: {
                  ...state.monthCTeamKeys,
                  [monthKey]: event.target.value as CTeamKey,
                },
                monthCTeamKeyOverrides: {
                  ...state.monthCTeamKeyOverrides,
                  [monthKey]: true,
                },
              })
            }
          >
            <option value="" disabled>
              기존 직접입력값
            </option>
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
    );
  }

  return (
    <section className="no-print mx-auto grid max-w-[1480px] gap-3 px-3 py-3 sm:px-4">
      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
          <div className="hidden text-xs font-bold text-slate-500 lg:block">
            월간/연간 보기
          </div>
          <div className="grid w-full grid-cols-[56px_minmax(0,1fr)_56px] items-center justify-center gap-2 sm:flex sm:w-auto sm:gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onPreviousMonth}
              aria-label="이전 달"
              className="min-h-12 w-full min-w-0 px-2 text-lg sm:w-24 sm:text-sm"
            >
              <span className="sm:hidden">◀</span>
              <span className="hidden sm:inline">◀ 이전</span>
            </Button>
            <button
              type="button"
              className="min-h-12 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 text-center text-lg font-black text-slate-950 transition hover:bg-slate-100 sm:min-w-48 sm:px-6 sm:text-xl"
              onClick={onToggleView}
            >
              {state.selectedYear}년 {state.selectedMonthIndex + 1}월
            </button>
            <Button
              type="button"
              variant="secondary"
              onClick={onNextMonth}
              aria-label="다음 달"
              className="min-h-12 w-full min-w-0 px-2 text-lg sm:w-24 sm:text-sm"
            >
              <span className="sm:hidden">▶</span>
              <span className="hidden sm:inline">다음 ▶</span>
            </Button>
          </div>
          <div className="hidden justify-self-end text-xs font-bold text-slate-500 lg:block">
            기준 설정
          </div>
        </div>

        <details className="group md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-800">
            기준 설정
            <span className="text-slate-500 group-open:rotate-180">⌄</span>
          </summary>
          {renderQuickFields('mt-3 grid grid-cols-2 gap-2')}
        </details>

        {renderQuickFields('hidden gap-2 md:grid md:grid-cols-3 xl:grid-cols-6')}
      </div>
    </section>
  );
}
