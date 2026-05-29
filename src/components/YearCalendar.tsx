import type { CalendarDay, CCRCalendarState } from '../types/ccr.js';
import { WEEKDAY_LABELS } from '../constants/defaults.js';
import { generateMonthSchedule } from '../logic/generateMonthSchedule.js';
import { getDaysInMonth, toDateKey } from '../utils/date.js';

type YearCalendarProps = {
  state: CCRCalendarState;
  onSelectMonth: (monthIndex: number) => void;
};

type CompanyEventTone = 'holiday' | 'adjustment' | 'company' | 'work';

type CompanyCalendarEvent = {
  label: string;
  tone: CompanyEventTone;
  off?: boolean;
};

type MonthNote = {
  label: string;
  tone: CompanyEventTone;
};

const COMPANY_DAY_EVENTS_2026: Record<string, CompanyCalendarEvent> = {
  '2026-01-01': { label: '신정휴무', tone: 'company', off: true },
  '2026-01-02': { label: '신정휴무', tone: 'company', off: true },
  '2026-02-16': { label: '설날휴무', tone: 'company', off: true },
  '2026-02-17': { label: '설날', tone: 'holiday', off: true },
  '2026-02-18': { label: '설날휴무', tone: 'company', off: true },
  '2026-02-19': { label: '설날휴무', tone: 'company', off: true },
  '2026-02-20': { label: '휴무조정', tone: 'adjustment', off: true },
  '2026-03-01': { label: '삼일절', tone: 'holiday', off: true },
  '2026-03-02': { label: '휴일중복', tone: 'adjustment', off: true },
  '2026-05-01': { label: '노동절', tone: 'company', off: true },
  '2026-05-05': { label: '어린이날', tone: 'holiday', off: true },
  '2026-05-24': { label: '석가탄신일', tone: 'holiday', off: true },
  '2026-05-25': { label: '휴일중복', tone: 'adjustment', off: true },
  '2026-06-03': { label: '지방선거', tone: 'holiday', off: true },
  '2026-06-06': { label: '현충일', tone: 'holiday', off: true },
  '2026-07-25': { label: '노조창립일', tone: 'company', off: true },
  '2026-08-03': { label: '하기휴무', tone: 'company', off: true },
  '2026-08-04': { label: '하기휴무', tone: 'company', off: true },
  '2026-08-05': { label: '하기휴무', tone: 'company', off: true },
  '2026-08-06': { label: '하기휴무', tone: 'company', off: true },
  '2026-08-07': { label: '하기휴무', tone: 'company', off: true },
  '2026-08-15': { label: '광복절', tone: 'holiday', off: true },
  '2026-08-17': { label: '휴일중복', tone: 'adjustment', off: true },
  '2026-09-24': { label: '추석휴무', tone: 'company', off: true },
  '2026-09-25': { label: '추석', tone: 'holiday', off: true },
  '2026-09-26': { label: '추석휴무', tone: 'company', off: true },
  '2026-09-27': { label: '추석휴무', tone: 'company', off: true },
  '2026-09-28': { label: '휴일중복', tone: 'adjustment', off: true },
  '2026-10-03': { label: '개천절', tone: 'holiday', off: true },
  '2026-10-05': { label: '휴일중복', tone: 'adjustment', off: true },
  '2026-10-09': { label: '한글날', tone: 'holiday', off: true },
  '2026-12-25': { label: '성탄일', tone: 'holiday', off: true },
  '2026-12-29': { label: '회사창립일', tone: 'work' },
  '2026-12-31': { label: '휴무조정', tone: 'adjustment', off: true },
};

const COMPANY_MONTH_NOTES_2026: Record<number, MonthNote[]> = {
  0: [{ label: '신정휴무 (1/1~1/2)', tone: 'company' }],
  1: [
    { label: '설날휴무 (2/16~2/19)', tone: 'company' },
    { label: '설날 (2/17)', tone: 'holiday' },
    { label: '휴무조정 (5/25 -> 2/20)', tone: 'adjustment' },
  ],
  2: [
    { label: '삼일절 (3/1)', tone: 'holiday' },
    { label: '휴일중복 (3/2)', tone: 'adjustment' },
  ],
  4: [
    { label: '노동절 (5/1)', tone: 'company' },
    { label: '어린이날 (5/5)', tone: 'holiday' },
    { label: '석가탄신일 (5/24)', tone: 'holiday' },
    { label: '휴일중복 (5/25)', tone: 'adjustment' },
  ],
  5: [
    { label: '전국동시지방선거 (6/3)', tone: 'holiday' },
    { label: '현충일 (6/6)', tone: 'holiday' },
  ],
  6: [{ label: '노조창립일 (7/25)', tone: 'company' }],
  7: [
    { label: '하기휴무 (8/3~8/7)', tone: 'company' },
    { label: '광복절 (8/15)', tone: 'holiday' },
    { label: '휴일중복 (8/17)', tone: 'adjustment' },
  ],
  8: [
    { label: '추석휴무 (9/24~9/28)', tone: 'company' },
    { label: '추석 (9/25)', tone: 'holiday' },
    { label: '휴일중복 (9/28)', tone: 'adjustment' },
  ],
  9: [
    { label: '개천절 (10/3)', tone: 'holiday' },
    { label: '휴일중복 (10/5)', tone: 'adjustment' },
    { label: '한글날 (10/9)', tone: 'holiday' },
  ],
  11: [
    { label: '성탄일 (12/25)', tone: 'holiday' },
    { label: '회사창립일 (12/29) 정상근무', tone: 'work' },
    { label: '휴무조정 (12/29 -> 12/31)', tone: 'adjustment' },
    { label: '신정휴무 (27. 1/1~1/2)', tone: 'company' },
  ],
};

const HALF_YEAR_GROUPS = [
  [0, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11],
];

function getCompanyEvent(dateKey: string, year: number) {
  if (year !== 2026) return undefined;
  return COMPANY_DAY_EVENTS_2026[dateKey];
}

function getCompanyMonthNotes(year: number, monthIndex: number) {
  if (year !== 2026) return [];
  return COMPANY_MONTH_NOTES_2026[monthIndex] || [];
}

function getDynamicMonthNotes(days: CalendarDay[]) {
  const labels = days
    .flatMap((day) => [day.holidayName, day.specialWorkLabel, day.userComment])
    .filter(Boolean);
  return Array.from(new Set(labels)).slice(0, 5).map((label) => ({
    label,
    tone: 'work' as CompanyEventTone,
  }));
}

function getDayToneClass(
  day: CalendarDay | null,
  event: CompanyCalendarEvent | undefined,
  dayOfWeek: number,
) {
  if (!day) return 'bg-white text-slate-300';
  if (event?.tone === 'work') return 'bg-white text-slate-700';
  if (event?.tone === 'adjustment') return 'bg-[#ffe7dc] text-[#ba3a22]';
  if (event?.tone === 'company' || event?.tone === 'holiday' || day.holidayName || day.isManualOff) {
    return 'bg-[#ffe1d7] text-[#b3261e]';
  }
  if (day.dayOfWeek === 0) return 'bg-[#fff3a5] text-[#b3261e]';
  if (day.dayOfWeek === 6 || dayOfWeek === 6) return 'bg-[#fff4a8] text-[#9a6a00]';
  if (day.isOff) return 'bg-[#ffe1d7] text-[#b3261e]';
  return day.isNight ? 'bg-[#f0eaff] text-[#5b21b6]' : 'bg-[#e9fbf2] text-[#1f7a56]';
}

function getDayBadge(day: CalendarDay, event: CompanyCalendarEvent | undefined) {
  if (event?.label && event.tone !== 'work') return event.label;
  if (day.holidayName) return day.holidayName;
  if (day.specialWorkLabel) return day.specialWorkLabel;
  if (day.isManualOff) return '휴무';
  if (day.weekTeamLabel) return day.weekTeamLabel;
  return '';
}

function getNoteToneClass(tone: CompanyEventTone) {
  if (tone === 'holiday') return 'text-[#b3261e]';
  if (tone === 'adjustment') return 'text-[#1e64b7]';
  if (tone === 'company') return 'text-[#5a3b00]';
  return 'text-slate-700';
}

function buildCalendarCells(state: CCRCalendarState, monthIndex: number, days: CalendarDay[]) {
  const daysInMonth = getDaysInMonth(state.selectedYear, monthIndex);
  const firstDayOfMonthWeekday = new Date(state.selectedYear, monthIndex, 1).getDay();
  const totalCells = Math.ceil((firstDayOfMonthWeekday + daysInMonth) / 7) * 7;
  const dayMap = new Map(days.map((day) => [day.day, day]));

  return Array.from({ length: totalCells }, (_, cellIndex) => {
    const dayNumber = cellIndex - firstDayOfMonthWeekday + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return {
        key: `empty-${cellIndex}`,
        day: null,
        event: undefined,
        dayOfWeek: cellIndex % 7,
      };
    }
    const day = dayMap.get(dayNumber) || null;
    const dateKey = toDateKey(state.selectedYear, monthIndex, dayNumber);
    return {
      key: dateKey,
      day,
      event: getCompanyEvent(dateKey, state.selectedYear),
      dayOfWeek: cellIndex % 7,
    };
  });
}

export function YearCalendar({ state, onSelectMonth }: YearCalendarProps) {
  const schedules = Array.from({ length: 12 }, (_, monthIndex) =>
    generateMonthSchedule(state, state.selectedYear, monthIndex),
  );

  return (
    <section className="mx-auto max-w-[1680px] overflow-x-auto px-3 pb-8 sm:px-4">
      <div className="mb-4 min-w-[1180px] rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 border-b-4 border-[#2b2f36] pb-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-[0] text-slate-950 md:text-3xl">
              {state.selectedYear}년 공장 생산예정표
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              월을 누르면 해당 월 CCR 캘린더로 이동합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded border border-[#fff3a5] bg-[#fff3a5] px-2 py-1 text-[#9a6a00]">주말</span>
            <span className="rounded border border-[#ffe1d7] bg-[#ffe1d7] px-2 py-1 text-[#b3261e]">휴무</span>
            <span className="rounded border border-[#e9fbf2] bg-[#e9fbf2] px-2 py-1 text-[#1f7a56]">주간</span>
            <span className="rounded border border-[#f0eaff] bg-[#f0eaff] px-2 py-1 text-[#5b21b6]">야간</span>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {HALF_YEAR_GROUPS.map((group, groupIndex) => (
            <div key={groupIndex} className="overflow-hidden rounded border border-slate-300">
              {group.map((monthIndex) => {
                const schedule = schedules[monthIndex];
                const cells = buildCalendarCells(state, monthIndex, schedule.days);
                const companyNotes = getCompanyMonthNotes(state.selectedYear, monthIndex);
                const notes = companyNotes.length > 0 ? companyNotes : getDynamicMonthNotes(schedule.days);
                const workDays = schedule.days.filter((day) => {
                  const event = getCompanyEvent(day.dateKey, state.selectedYear);
                  return !day.isOff && event?.off !== true;
                }).length;
                const isSelected = monthIndex === state.selectedMonthIndex;

                return (
                  <button
                    key={monthIndex}
                    type="button"
                    onClick={() => onSelectMonth(monthIndex)}
                    className={`grid w-full grid-cols-[54px_minmax(360px,1fr)_230px] border-b border-slate-300 text-left transition last:border-b-0 hover:bg-[#f6fbff] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#003D82] max-lg:grid-cols-[46px_minmax(330px,1fr)_190px] ${
                      isSelected ? 'bg-[#f7fbff]' : 'bg-white'
                    }`}
                    aria-label={`${monthIndex + 1}월 월간 캘린더로 이동`}
                  >
                    <div className="flex flex-col items-center justify-center gap-2 border-r border-slate-300 bg-[#aee9f7] px-1 py-2 text-center">
                      <span className="text-xl font-black text-[#0f3f66]">{monthIndex + 1}월</span>
                      <span className="text-[10px] font-black leading-tight text-[#386479]">근무 {workDays}일</span>
                    </div>

                    <div className="border-r border-slate-300 p-1.5">
                      <div className="grid grid-cols-7 overflow-hidden rounded-sm border border-slate-200">
                        {WEEKDAY_LABELS.map((label, index) => (
                          <div
                            key={label}
                            className={`border-b border-r border-slate-200 bg-[#c7f1fb] py-1 text-center text-[10px] font-black last:border-r-0 ${
                              index === 0 ? 'text-[#b3261e]' : index === 6 ? 'text-[#245aa0]' : 'text-slate-700'
                            }`}
                          >
                            {label}
                          </div>
                        ))}
                        {cells.map((cell) => (
                          <div
                            key={cell.key}
                            className={`min-h-[26px] border-r border-t border-slate-200 px-1 py-0.5 last:border-r-0 ${getDayToneClass(
                              cell.day,
                              cell.event,
                              cell.dayOfWeek,
                            )}`}
                          >
                            {cell.day ? (
                              <div className="flex min-h-[22px] flex-col justify-center">
                                <div className="flex items-baseline justify-between gap-1">
                                  <span className="text-[11px] font-black leading-none">{cell.day.day}</span>
                                  <span className="text-[8px] font-black leading-none opacity-80">
                                    {cell.day.isNight ? '야' : '주'}
                                  </span>
                                </div>
                                {getDayBadge(cell.day, cell.event) ? (
                                  <span className="mt-0.5 truncate text-[8px] font-black leading-tight">
                                    {getDayBadge(cell.day, cell.event)}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-2">
                      <div className="mb-1 rounded-sm bg-[#c7f1fb] py-1 text-center text-[10px] font-black text-slate-700">
                        비고
                      </div>
                      {notes.length > 0 ? (
                        <ul className="space-y-1">
                          {notes.map((note) => (
                            <li
                              key={`${monthIndex}-${note.label}`}
                              className={`text-[10px] font-black leading-snug ${getNoteToneClass(note.tone)}`}
                            >
                              {note.label}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[10px] font-bold leading-snug text-slate-400">등록된 비고 없음</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
