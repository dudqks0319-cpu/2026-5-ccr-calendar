import type { CalendarDay } from '../types/ccr.js';
type DayCellProps = {
  day: CalendarDay;
  searchTerm: string;
  onClick: (day: CalendarDay) => void;
};

function includesSearch(day: CalendarDay, searchTerm: string) {
  const term = searchTerm.trim();
  if (!term) return false;
  return [
    day.am,
    day.pm,
    day.cTeamText,
    day.materialWorker,
    day.comment,
    day.holidayName,
    day.weekTeamLabel,
    day.specialWorkLabel,
    day.userComment,
    day.sealerTeam,
  ]
    .join(' ')
    .includes(term);
}

export function DayCell({ day, searchTerm, onClick }: DayCellProps) {
  const matched = includesSearch(day, searchTerm);
  const displayCTeamText = day.cTeamText.replaceAll(',', '');
  const topLabel = day.holidayName || day.specialWorkLabel || day.weekTeamLabel;
  const userMemo = day.userComment.trim();
  const isSaturdayOff = day.dayOfWeek === 6 && day.isOff;
  const isSunday = day.dayOfWeek === 0;
  const shouldShowOffLabel = day.isManualOff && !isSaturdayOff && !day.holidayName;
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
      className={`calendar-day relative flex min-h-[96px] w-full cursor-pointer flex-col border-r border-t border-slate-200 p-1.5 text-left transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#003D82] sm:min-h-[126px] sm:p-2 ${bgClass} ${
        matched ? 'ring-2 ring-emerald-400' : ''
      }`}
    >
      <div className="flex min-h-6 items-start justify-between gap-1 sm:min-h-7">
        <div className={`min-w-0 break-words text-base font-black leading-tight sm:text-xl ${isSunday ? 'text-[#c82032]' : day.dayOfWeek === 6 ? 'text-[#176fc0]' : 'text-slate-950'}`}>
          {day.day}
          {topLabel ? (
            <span className={`ml-1 align-middle text-[10px] font-black leading-tight sm:ml-2 sm:text-xs ${
              day.holidayName || day.specialWorkLabel ? 'text-[#c82032]' : 'text-[#123d72]'
            }`}>
              {topLabel}
            </span>
          ) : null}
        </div>
        {!day.isOff && !isSunday ? (
          <span
            className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-black text-white sm:size-6 sm:text-xs ${
              day.isNight ? 'bg-[#507489]' : 'bg-[#f3bd00]'
            }`}
          >
            {shiftBadge}
          </span>
        ) : null}
      </div>

      {isSaturdayOff ? (
        <div className="grid flex-1 place-items-center text-base font-black text-[#c82032] sm:text-xl">OFF</div>
      ) : null}

      {shouldShowOffLabel ? (
        <div className="mt-1 text-[11px] font-black leading-tight text-[#c82032] sm:text-sm">휴무</div>
      ) : null}

      {!isSaturdayOff && !day.holidayName && day.cTeamText ? (
        <div className="mt-1 break-words text-[10px] font-black leading-tight tracking-normal text-purple-900 sm:text-sm">
          C조 {displayCTeamText}
        </div>
      ) : null}

      {!day.isOff && day.am && day.pm ? (
        <div className="mt-1 rounded bg-slate-400/20 px-1 py-0.5 text-[10px] font-black leading-tight text-slate-950 sm:mt-2 sm:rounded-md sm:px-2 sm:py-1 sm:text-base">
          CCR {day.am} {day.pm}
        </div>
      ) : null}

      {userMemo ? (
        <div
          className={`mt-1 whitespace-pre-line break-words text-[10px] font-black leading-snug sm:text-xs ${
            day.isOff ? 'text-[#c82032]' : 'text-[#123d72]'
          }`}
        >
          {userMemo}
        </div>
      ) : null}
    </button>
  );
}
