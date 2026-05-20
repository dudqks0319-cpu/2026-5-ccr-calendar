import type { CCRCalendarState } from '../types/ccr.js';
import { WEEKDAY_LABELS } from '../constants/defaults.js';
import { generateMonthSchedule } from '../logic/generateMonthSchedule.js';

type YearCalendarProps = {
  state: CCRCalendarState;
  onSelectMonth: (monthIndex: number) => void;
};

export function YearCalendar({ state, onSelectMonth }: YearCalendarProps) {
  return (
    <section className="mx-auto grid max-w-[1480px] gap-4 px-4 pb-8 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 12 }, (_, monthIndex) => {
        const schedule = generateMonthSchedule(state, state.selectedYear, monthIndex);
        const emptyPrefix = Array.from({ length: schedule.firstDayOfMonthWeekday }, (_, index) => index);

        return (
          <button
            type="button"
            key={monthIndex}
            onClick={() => onSelectMonth(monthIndex)}
            className={`cursor-pointer rounded-lg border bg-white p-3 text-left shadow-sm transition hover:border-[#003D82] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#003D82] ${
              monthIndex === state.selectedMonthIndex ? 'border-[#003D82]' : 'border-slate-200'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950">{monthIndex + 1}월</h3>
              <span className="text-xs font-bold text-slate-500">
                근무 {schedule.days.filter((day) => !day.isOff).length}일
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="text-center text-[10px] font-black text-slate-400">
                  {label}
                </div>
              ))}
              {emptyPrefix.map((index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}
              {schedule.days.map((day) => (
                <div
                  key={day.dateKey}
                  className={`grid aspect-square place-items-center rounded text-[11px] font-bold ${
                    day.isOff
                      ? 'bg-red-50 text-red-700'
                      : day.isNight
                        ? 'bg-violet-50 text-violet-700'
                        : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {day.day}
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </section>
  );
}
