import type { CalendarDay, CCRCalendarState } from '../types/ccr.js';
import { buildBaseRotation } from '../logic/buildBaseRotation.js';
import { isDateOff } from '../logic/generateMonthSchedule.js';
import { Button, Field, Input, Modal, Textarea } from './ui.js';

type DayEditModalProps = {
  day: CalendarDay;
  state: CCRCalendarState;
  onChange: (state: CCRCalendarState) => void;
  onClose: () => void;
};

function setRecordValue<T>(
  record: Record<string, T>,
  key: string,
  value: T | undefined,
): Record<string, T> {
  const next = { ...record };
  if (value === undefined || value === '') delete next[key];
  else next[key] = value;
  return next;
}

export function DayEditModal({ day, state, onChange, onClose }: DayEditModalProps) {
  const allWorkers = buildBaseRotation(state.dayTeams);
  const override = state.overrides[day.dateKey] || {};
  const isCurrentlyOff = isDateOff(day.dateKey, day.dayOfWeek, state);
  const isManualOffChange =
    typeof override.isOff === 'boolean' || typeof state.offDays[day.dateKey] === 'boolean';
  const isCurrentSaturdayOvertime =
    day.dayOfWeek === 6 &&
    (override.isSaturdayOvertime ?? state.saturdayOvertime[day.dateKey]) === true;

  function updateOverride(nextOverride: typeof override) {
    const nextOverrides = { ...state.overrides };
    const hasValue = Object.values(nextOverride).some((value) => value !== undefined && value !== '');
    if (hasValue) nextOverrides[day.dateKey] = nextOverride;
    else delete nextOverrides[day.dateKey];
    onChange({
      ...state,
      overrides: nextOverrides,
    });
  }

  function updateOff(isOff: boolean) {
    const nextOverride = {
      ...override,
      isOff,
    };

    onChange({
      ...state,
      offDays: {
        ...state.offDays,
        [day.dateKey]: isOff,
      },
      overrides: {
        ...state.overrides,
        [day.dateKey]: nextOverride,
      },
    });
  }

  return (
    <Modal title={`${day.dateKey} 수정`} onClose={onClose} width="max-w-2xl">
      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            type="button"
            variant={isCurrentlyOff ? 'danger' : 'secondary'}
            onClick={() => updateOff(!isCurrentlyOff)}
            aria-pressed={isCurrentlyOff}
          >
            {isCurrentlyOff
              ? isManualOffChange
                ? '휴무일로 변경됨 · 다시 누르면 근무일'
                : '근무일로 변경'
              : '휴무일로 변경'}
          </Button>
          <Button
            type="button"
            variant={isCurrentSaturdayOvertime ? 'primary' : 'secondary'}
            disabled={day.dayOfWeek !== 6}
            onClick={() => {
              const nextValue = !isCurrentSaturdayOvertime;
              const nextOverride = {
                ...override,
                isSaturdayOvertime: nextValue,
              };
              if (nextValue) {
                nextOverride.isOff = false;
              } else {
                delete nextOverride.isOff;
              }

              onChange({
                ...state,
                saturdayOvertime: {
                  ...state.saturdayOvertime,
                  [day.dateKey]: nextValue,
                },
                overrides: {
                  ...state.overrides,
                  [day.dateKey]: nextOverride,
                },
              });
            }}
          >
            특근 {isCurrentSaturdayOvertime ? 'ON' : 'OFF'}
          </Button>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            {day.isNight ? '야간 주차' : '주간 주차'}
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            {day.sealerTeam ? `안착불량 ${day.sealerTeam}` : '안착불량 없음'}
          </div>
        </div>

        <div
          className={`rounded-md border px-3 py-2 text-sm font-bold ${
            isCurrentlyOff
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          현재 상태: {isCurrentlyOff ? '휴무일' : '근무일'}
          {isManualOffChange ? ' · 수동 변경 적용됨' : ''}
        </div>

        <datalist id="worker-list">
          {allWorkers.map((workerName) => (
            <option key={workerName} value={workerName} />
          ))}
        </datalist>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="전반 근무자">
            <Input
              list="worker-list"
              value={override.am ?? ''}
              placeholder={`자동: ${day.am}`}
              onChange={(event) =>
                updateOverride({
                  ...override,
                  am: event.target.value,
                })
              }
            />
          </Field>
          <Field label="후반 근무자">
            <Input
              list="worker-list"
              value={override.pm ?? ''}
              placeholder={`자동: ${day.pm}`}
              onChange={(event) =>
                updateOverride({
                  ...override,
                  pm: event.target.value,
                })
              }
            />
          </Field>
          <Field label="C조 직접 입력">
            <Input
              value={override.cTeamText ?? ''}
              placeholder={day.cTeamText || '야간 주차에 표시'}
              onChange={(event) =>
                updateOverride({
                  ...override,
                  cTeamText: event.target.value,
                })
              }
            />
          </Field>
          <Field label="자재담당자 직접 입력">
            <Input
              list="worker-list"
              value={override.materialWorker ?? ''}
              placeholder={day.materialWorker || '주간 주차에 표시'}
              onChange={(event) =>
                updateOverride({
                  ...override,
                  materialWorker: event.target.value,
                })
              }
            />
          </Field>
        </div>

        <Field label="메모/특이사항">
          <Textarea
            value={state.comments[day.dateKey] ?? override.comment ?? ''}
            placeholder="교육, 설비 이슈, 현장 특이사항"
            onChange={(event) =>
              onChange({
                ...state,
                comments: setRecordValue(state.comments, day.dateKey, event.target.value),
              })
            }
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              const nextOverrides = { ...state.overrides };
              delete nextOverrides[day.dateKey];
              const nextOffDays = { ...state.offDays };
              delete nextOffDays[day.dateKey];
              const nextComments = { ...state.comments };
              delete nextComments[day.dateKey];
              const nextSaturday = { ...state.saturdayOvertime };
              delete nextSaturday[day.dateKey];
              onChange({
                ...state,
                overrides: nextOverrides,
                offDays: nextOffDays,
                comments: nextComments,
                saturdayOvertime: nextSaturday,
              });
            }}
          >
            이 날짜 초기화
          </Button>
          <Button type="button" onClick={onClose}>
            완료
          </Button>
        </div>
      </div>
    </Modal>
  );
}
