import type { CalendarDay, CCRCalendarState, MonthSchedule } from '../types/ccr.js';
import { WEEKDAY_LABELS } from '../constants/defaults.js';
import { getMonthCTeamKey, getMonthCTeamMembers, getMonthStartWithNight } from '../logic/generateMonthSchedule.js';
import { toMonthKey } from '../utils/date.js';
import { DayCell } from './DayCell.js';
import { Textarea } from './ui.js';

type MonthCalendarProps = {
  state: CCRCalendarState;
  schedule: MonthSchedule;
  searchTerm: string;
  onDayClick: (day: CalendarDay) => void;
  onChange: (state: CCRCalendarState) => void;
};

export function MonthCalendar({
  state,
  schedule,
  searchTerm,
  onDayClick,
  onChange,
}: MonthCalendarProps) {
  const emptyPrefix = Array.from({ length: schedule.firstDayOfMonthWeekday }, (_, index) => index);
  const monthKey = toMonthKey(schedule.year, schedule.monthIndex);
  const monthMemo = state.monthMemo[monthKey] || '';
  const selectedCTeamNames = getMonthCTeamMembers(state, schedule.year, schedule.monthIndex);
  const selectedCTeamKey = getMonthCTeamKey(state, schedule.year, schedule.monthIndex);
  const selectedCTeamLabel = selectedCTeamKey ? state.cTeams[selectedCTeamKey].label : '직접입력 C조';
  const startWithNight = getMonthStartWithNight(state, schedule.year, schedule.monthIndex);
  const weekRowCount = Math.ceil((emptyPrefix.length + schedule.days.length) / 7);
  const emptySuffix = Array.from(
    { length: weekRowCount * 7 - emptyPrefix.length - schedule.days.length },
    (_, index) => index,
  );

  return (
    <section
      id="print-area"
      className={`print-${weekRowCount}weeks mx-auto w-full min-w-0 max-w-[1480px] bg-white px-3 py-4 text-slate-950 shadow-sm sm:px-5 sm:py-6 md:min-w-[1180px] md:px-8 md:py-7`}
    >
      <div className="mb-4 border-b-[3px] border-[#0b376b] pb-3 text-center sm:mb-7">
        <h2 className="text-2xl font-black tracking-normal text-[#0b376b] sm:text-3xl">
          {schedule.year}년 {schedule.monthIndex + 1}월 A조
        </h2>
        <p className="mt-1 text-base font-bold tracking-normal text-purple-900 sm:text-xl sm:tracking-[0.08em]">
          C조: {selectedCTeamNames.join(' ')}
        </p>
      </div>

      <div className="sr-only border-b border-slate-200 px-4 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              {schedule.year}년 {schedule.monthIndex + 1}월 CCR 근무표
            </h2>
            <p className="text-sm font-medium text-slate-500">
              {startWithNight ? '첫 주 야간 시작' : '첫 주 주간 시작'} · {selectedCTeamLabel} 선택 · 자동저장
            </p>
          </div>
          <div className="text-sm font-bold text-slate-600">
            순번 {Object.values(state.dayTeams).flatMap((team) => team.members).filter(Boolean).length}명
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-t-lg border border-slate-200">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={label}
            className={`px-1 py-2 text-center text-sm font-black text-white sm:px-2 sm:py-3 sm:text-lg ${
              index === 0 ? 'bg-[#d61f25]' : index === 6 ? 'bg-[#176fc0]' : 'bg-[#062f63]'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 overflow-hidden border-l border-slate-200">
        {emptyPrefix.map((index) => (
          <div
            key={`empty-${index}`}
            className="calendar-empty-day min-h-[96px] border-r border-t border-slate-200 bg-white sm:min-h-[126px]"
          />
        ))}
        {schedule.days.map((day) => (
          <DayCell key={day.dateKey} day={day} searchTerm={searchTerm} onClick={onDayClick} />
        ))}
        {emptySuffix.map((index) => (
          <div
            key={`suffix-empty-${index}`}
            className="calendar-empty-day min-h-[96px] border-r border-t border-slate-200 bg-white sm:min-h-[126px]"
          />
        ))}
      </div>

      <div className="mt-4 grid gap-2 border border-slate-300 p-3 sm:mt-8 sm:p-6">
        <label className="sr-only text-sm font-black text-slate-700" htmlFor="monthMemo">
          전체 월 메모
        </label>
        <Textarea
          id="monthMemo"
          value={monthMemo}
          placeholder="월 전체 공지, 특이사항, 교대 이슈를 기록하세요."
          className="screen-month-memo min-h-28 resize-none border-0 font-mono text-sm leading-7 text-slate-700 focus:border-transparent focus:ring-0 sm:min-h-32 sm:text-base sm:leading-8"
          onChange={(event) =>
            onChange({
              ...state,
              monthMemo: {
                ...state.monthMemo,
                [monthKey]: event.target.value,
              },
            })
          }
        />
        <div className="print-month-memo hidden whitespace-pre-wrap font-mono text-base leading-8 text-slate-700">
          {monthMemo}
        </div>
      </div>
    </section>
  );
}
