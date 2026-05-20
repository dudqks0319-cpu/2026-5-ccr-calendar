import { WEEKDAY_LABELS } from '../constants/defaults.js';
import type { MonthSchedule } from '../types/ccr.js';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function exportScheduleToExcel(schedule: MonthSchedule) {
  const headers = [
    '날짜',
    '요일',
    '주야',
    '전반',
    '후반',
    'C조/조기가동',
    '자재담당',
    '특근',
    '안착불량 조치팀',
    '메모',
  ];
  const rows = schedule.days.map((day) => [
    day.dateKey,
    WEEKDAY_LABELS[day.dayOfWeek],
    day.isNight ? '야간' : '주간',
    day.am,
    day.pm,
    day.cTeamText,
    day.materialWorker,
    day.isSaturdayOvertime ? '특근' : '',
    day.sealerTeam,
    day.comment,
  ]);

  const tableRows = [headers, ...rows]
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td style="border:1px solid #cbd5e1;padding:6px;">${escapeHtml(String(cell))}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  const html = `<!doctype html><html><head><meta charset="UTF-8" /></head><body><table>${tableRows}</table></body></html>`;
  const blob = new Blob(['\ufeff', html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CCR근무표_${schedule.year}_${schedule.monthIndex + 1}월.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
