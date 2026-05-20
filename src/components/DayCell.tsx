import type { CalendarDay } from '../types/ccr.js';
type DayCellProps = {
  day: CalendarDay;
  searchTerm: string;
  onClick: (day: CalendarDay) => void;
};

function includesSearch(day: CalendarDay, searchTerm: string) {
  const term = searchTerm.trim();
  if (!term) return false;
  return [day.am, day.pm, day.cTeamText, day.materialWorker, day.comment, day.sealerTeam]
    .join(' ')
    .includes(term);
}

export function DayCell({ day, searchTerm, onClick }: DayCellProps) {
  const matched = includesSearch(day, searchTerm);
  const displayCTeamText = day.cTeamText.replaceAll(',', '');
  const isHoliday = ['노동절', '어린이날', '석가탄신일', '지방선거', '현충일'].includes(
    day.comment,
  );
  const isSaturdayOff = day.dayOfWeek === 6 && day.isOff;
  const isSunday = day.dayOfWeek === 0;
  const shiftBadge = day.isNight ? '야' : '주';
  const bgClass = isSunday
    ? 'bg-[#ffd6dd]'
    : day.dayOfWeek === 6
      ? 'bg-[#dff1ff]'
      : day.isNight
        ? 'bg-[#edf2f6]'
        : 'bg-[#fff9b8]';

  return (
    <button
      type="button"
      onClick={() => onClick(day)}
      className={`calendar-day relative flex min-h-[126px] w-full cursor-pointer flex-col border-r border-t border-slate-200 p-2 text-left transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#003D82] ${bgClass} ${
        matched ? 'ring-2 ring-emerald-400' : ''
      }`}
    >
      <div className="flex min-h-7 items-start justify-between gap-1">
        <div className={`text-xl font-black ${isSunday ? 'text-[#c82032]' : day.dayOfWeek === 6 ? 'text-[#176fc0]' : 'text-slate-950'}`}>
          {day.day}
          {day.comment ? (
            <span className={`ml-2 align-middle text-xs font-black ${isHoliday ? 'text-[#c82032]' : 'text-[#123d72]'}`}>
              {day.comment}
            </span>
          ) : null}
        </div>
        {!day.isOff && !isSunday ? (
          <span
            className={`grid size-6 place-items-center rounded-full text-xs font-black text-white ${
              day.isNight ? 'bg-[#507489]' : 'bg-[#f3bd00]'
            }`}
          >
            {shiftBadge}
          </span>
        ) : null}
      </div>

      {isSaturdayOff ? (
        <div className="grid flex-1 place-items-center text-xl font-black text-[#c82032]">OFF</div>
      ) : null}

      {!isSaturdayOff && !isHoliday && day.cTeamText ? (
        <div className="mt-1 text-sm font-black tracking-normal text-purple-900">
          C조 {displayCTeamText}
        </div>
      ) : null}

      {!day.isOff && day.am && day.pm ? (
        <div className="mt-2 rounded-md bg-slate-400/20 px-2 py-1 text-base font-black leading-tight text-slate-950">
          CCR {day.am} {day.pm}
        </div>
      ) : null}
    </button>
  );
}
