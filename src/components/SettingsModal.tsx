import { useMemo, useState } from 'react';
import type {
  CCRCalendarState,
  CTeamConfig,
  CTeamDepartments,
  CTeamExcludeMode,
  CTeamKey,
  MaterialMode,
  MonthStartAnchor,
  ShiftStartType,
  TeamKey,
} from '../types/ccr.js';
import { C_TEAM_KEYS, DEFAULT_STATE, TEAM_KEYS } from '../constants/defaults.js';
import { buildBaseRotation } from '../logic/buildBaseRotation.js';
import {
  findMonthStartPointerForAnchors,
  generateMonthSchedule,
  getMonthCTeamMembers,
} from '../logic/generateMonthSchedule.js';
import { toDateKey, toMonthKey } from '../utils/date.js';
import { Button, Field, Input, Modal, Select, Textarea } from './ui.js';

type SettingsModalProps = {
  state: CCRCalendarState;
  onChange: (state: CCRCalendarState) => void;
  onClose: () => void;
};

type TabKey = 'teams' | 'cteam' | 'material' | 'rules' | 'sealer' | 'theme';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'teams', label: '팀원 설정' },
  { key: 'cteam', label: 'C조 설정' },
  { key: 'material', label: '자재담당자' },
  { key: 'rules', label: '순번 규칙' },
  { key: 'sealer', label: '내판실러' },
  { key: 'theme', label: '화면/출력' },
];

const C_TEAM_DEPARTMENT_KEYS: TeamKey[] = ['robot', 'main', 'conveyor'];
const C_TEAM_MEMBER_DISPLAY_ORDER: TeamKey[] = ['conveyor', 'robot', 'main'];
const C_TEAM_DEPARTMENT_LABELS: Record<TeamKey, string> = {
  robot: '로보트팀',
  main: '주설비팀',
  conveyor: '컨베어팀',
};
const SHIFT_START_LABELS: Record<ShiftStartType, string> = {
  day: '주간',
  night: '야간',
};

function parseNames(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function namesToText(names: string[]) {
  return names.join(', ');
}

function buildDepartmentsFromMembers(team: CTeamConfig): CTeamDepartments {
  if (team.departments) return team.departments;
  const members = team.members.filter(Boolean);
  return {
    conveyor: members[0] ? [members[0]] : [],
    robot: members[1] ? [members[1]] : [],
    main: members[2] ? [members[2]] : [],
  };
}

function flattenCTeamDepartments(departments: CTeamDepartments) {
  return C_TEAM_MEMBER_DISPLAY_ORDER.flatMap((teamKey) => departments[teamKey] || []).filter(Boolean);
}

export function SettingsModal({ state, onChange, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('teams');
  const rotationPreview = useMemo(() => buildBaseRotation(state.dayTeams), [state.dayTeams]);
  const currentSchedule = useMemo(
    () => generateMonthSchedule(state, state.selectedYear, state.selectedMonthIndex),
    [state],
  );
  const monthKey = toMonthKey(state.selectedYear, state.selectedMonthIndex);
  const monthCTeamText = namesToText(
    state.monthCTeams[monthKey] || getMonthCTeamMembers(state, state.selectedYear, state.selectedMonthIndex),
  );
  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label || '설정';

  function updateDayTeam(teamKey: TeamKey, membersText: string) {
    onChange({
      ...state,
      dayTeams: {
        ...state.dayTeams,
        [teamKey]: {
          ...state.dayTeams[teamKey],
          members: parseNames(membersText),
        },
      },
    });
  }

  function updateCTeam(teamKey: CTeamKey, membersText: string) {
    onChange({
      ...state,
      cTeams: {
        ...state.cTeams,
        [teamKey]: {
          ...state.cTeams[teamKey],
          members: parseNames(membersText),
        },
      },
    });
  }

  function updateCTeamDepartment(
    cTeamKey: CTeamKey,
    departmentKey: TeamKey,
    membersText: string,
  ) {
    const currentTeam = state.cTeams[cTeamKey];
    const nextDepartments = {
      ...buildDepartmentsFromMembers(currentTeam),
      [departmentKey]: parseNames(membersText),
    };

    onChange({
      ...state,
      cTeams: {
        ...state.cTeams,
        [cTeamKey]: {
          ...currentTeam,
          departments: nextDepartments,
          members: flattenCTeamDepartments(nextDepartments),
        },
      },
    });
  }

  function getStartAnchor(shift: ShiftStartType): MonthStartAnchor {
    const savedAnchor = state.monthStartAnchors[monthKey]?.[shift];
    if (savedAnchor) return savedAnchor;

    const firstMatchingWorkDay = currentSchedule.days.find(
      (day) => !day.isOff && (shift === 'night' ? day.isNight : !day.isNight),
    );

    return {
      dateKey: firstMatchingWorkDay?.dateKey || toDateKey(state.selectedYear, state.selectedMonthIndex, 1),
      shift,
      am: firstMatchingWorkDay?.am || rotationPreview[0] || '',
      pm: firstMatchingWorkDay?.pm || rotationPreview[1] || '',
    };
  }

  function updateStartAnchor(shift: ShiftStartType, patch: Partial<MonthStartAnchor>) {
    const nextAnchor = {
      ...getStartAnchor(shift),
      ...patch,
      shift,
    };

    onChange({
      ...state,
      monthStartAnchors: {
        ...state.monthStartAnchors,
        [monthKey]: {
          ...state.monthStartAnchors[monthKey],
          [shift]: nextAnchor,
        },
      },
    });
  }

  function applyStartAnchor(anchor: MonthStartAnchor) {
    const nextAnchors = {
      ...state.monthStartAnchors[monthKey],
      [anchor.shift]: anchor,
    };
    const pointer = findMonthStartPointerForAnchors(
      state,
      state.selectedYear,
      state.selectedMonthIndex,
      Object.values(nextAnchors).filter(Boolean) as MonthStartAnchor[],
    );

    if (pointer === null) {
      alert('현재 휴무/C조 제외/자재 제외 규칙을 동시에 만족하는 시작 순번을 찾지 못했습니다. 기준일과 전반/후반 근무자를 다시 확인해주세요.');
      return;
    }

    onChange({
      ...state,
      monthStartAnchors: {
        ...state.monthStartAnchors,
        [monthKey]: nextAnchors,
      },
      monthStartPointer: {
        ...state.monthStartPointer,
        [monthKey]: pointer,
      },
    });
  }

  return (
    <Modal title="설정" onClose={onClose} width="max-w-6xl">
      <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-5">
        <aside className="no-print rounded-lg border border-slate-200 bg-slate-50 p-2">
          <div className="px-2 pb-2 text-xs font-black text-slate-500">설정 항목</div>
          <div className="flex gap-1 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              variant={activeTab === tab.key ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(tab.key)}
              className="shrink-0 justify-start whitespace-nowrap lg:w-full"
            >
              {tab.label}
            </Button>
          ))}
          </div>
        </aside>

        <div className="grid min-w-0 gap-4">
          <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-950">{activeTabLabel}</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {state.selectedYear}년 {state.selectedMonthIndex + 1}월 기준
              </span>
            </div>

        {activeTab === 'teams' ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-3">
              {TEAM_KEYS.map((teamKey) => (
                <Field key={teamKey} label={`${state.dayTeams[teamKey].label} 팀원`}>
                  <Textarea
                    value={namesToText(state.dayTeams[teamKey].members)}
                    onChange={(event) => updateDayTeam(teamKey, event.target.value)}
                  />
                </Field>
              ))}
            </div>
            <aside className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <h3 className="mb-3 text-base font-black text-slate-950">순번표 미리보기</h3>
              <ol className="grid gap-1">
                {rotationPreview.map((workerName, index) => (
                  <li key={`${workerName}-${index}`} className="flex items-center gap-2 text-sm font-semibold">
                    <span className="grid size-6 place-items-center rounded bg-white text-xs font-black text-slate-500">
                      {index + 1}
                    </span>
                    {workerName}
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        ) : null}

        {activeTab === 'cteam' ? (
          <div className="grid gap-4">
            <Field label={`${state.selectedYear}년 ${state.selectedMonthIndex + 1}월 C조 표시`}>
              <Input
                value={monthCTeamText}
                onChange={(event) =>
                  onChange({
                    ...state,
                    monthCTeams: {
                      ...state.monthCTeams,
                      [monthKey]: parseNames(event.target.value),
                    },
                  })
                }
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              {C_TEAM_KEYS.map((teamKey) => {
                const team = state.cTeams[teamKey];
                const departments = buildDepartmentsFromMembers(team);

                return (
                  <section key={teamKey} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-black text-slate-950">{team.label}</h3>
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                        {namesToText(flattenCTeamDepartments(departments))}
                      </span>
                    </div>
                    {C_TEAM_DEPARTMENT_KEYS.map((departmentKey) => (
                      <Field
                        key={`${teamKey}-${departmentKey}`}
                        label={`${team.label} ${C_TEAM_DEPARTMENT_LABELS[departmentKey]}`}
                      >
                        <Input
                          value={namesToText(departments[departmentKey] || [])}
                          onChange={(event) =>
                            updateCTeamDepartment(teamKey, departmentKey, event.target.value)
                          }
                        />
                      </Field>
                    ))}
                  </section>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeTab === 'material' ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="자재담당자 기능">
                <Select
                  value={state.materialRule.enabled ? 'on' : 'off'}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      materialRule: {
                        ...state.materialRule,
                        enabled: event.target.value === 'on',
                      },
                    })
                  }
                >
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                </Select>
              </Field>
              <Field label="선택 방식">
                <Select
                  value={state.materialRule.mode}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      materialRule: {
                        ...state.materialRule,
                        mode: event.target.value as MaterialMode,
                      },
                    })
                  }
                >
                  <option value="fixed">고정 1명</option>
                  <option value="date">날짜별 직접 지정</option>
                  <option value="rotation">순번 자동 지정</option>
                </Select>
              </Field>
              <Field label="주간일 때 제외">
                <Select
                  value={state.materialRule.excludeOnDayShift ? 'on' : 'off'}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      materialRule: {
                        ...state.materialRule,
                        excludeOnDayShift: event.target.value === 'on',
                      },
                    })
                  }
                >
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="기본 자재담당자">
                <Select
                  value={state.materialRule.fixedWorkerName}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      materialRule: {
                        ...state.materialRule,
                        fixedWorkerName: event.target.value,
                      },
                    })
                  }
                >
                  <option value="">미지정</option>
                  {rotationPreview.map((workerName) => (
                    <option key={workerName} value={workerName}>
                      {workerName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="순번 자동 지정 순서">
                <Input
                  value={namesToText(state.materialRule.rotationOrder)}
                  placeholder="예: 호빈, 광수, 우용"
                  onChange={(event) =>
                    onChange({
                      ...state,
                      materialRule: {
                        ...state.materialRule,
                        rotationOrder: parseNames(event.target.value),
                      },
                    })
                  }
                />
              </Field>
            </div>
          </div>
        ) : null}

        {activeTab === 'rules' ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="C조 근무자를 전반/후반 순번에서 제외">
                <Select
                  value={state.cTeamExcludeMode}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      cTeamExcludeMode: event.target.value as CTeamExcludeMode,
                    })
                  }
                >
                  <option value="always">항상 제외</option>
                  <option value="nightOnly">야간 주차에만 제외</option>
                  <option value="none">제외하지 않음</option>
                </Select>
              </Field>
              <Field label="토요일 기본 OFF">
                <Select
                  value={state.saturdayDefaultOff ? 'on' : 'off'}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      saturdayDefaultOff: event.target.value === 'on',
                    })
                  }
                >
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                </Select>
              </Field>
              <Field label="계산된 월 시작 순번">
                <Input
                  type="number"
                  min={0}
                  value={state.monthStartPointer[monthKey] ?? 0}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      monthStartPointer: {
                        ...state.monthStartPointer,
                        [monthKey]: Number(event.target.value),
                      },
                    })
                  }
                />
              </Field>
            </div>

            <section className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-950">첫 시작 CCR 지정</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    원하는 날짜의 전반/후반을 기준으로 잡으면, 현재 월 시작 순번을 역산해서 반영합니다.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-800">
                  C조 제외/자재 제외 포함 계산
                </span>
              </div>

              <div className="grid gap-3">
                {(['day', 'night'] as ShiftStartType[]).map((shift) => {
                  const anchor = getStartAnchor(shift);
                  return (
                    <div
                      key={shift}
                      className="grid gap-3 rounded-lg border border-blue-100 bg-white p-3 lg:grid-cols-[120px_1fr_1fr_1fr_auto]"
                    >
                      <div className="flex items-center text-sm font-black text-slate-950">
                        {SHIFT_START_LABELS[shift]} 시작
                      </div>
                      <Field label="기준 날짜" className="min-w-0">
                        <Input
                          type="date"
                          value={anchor.dateKey}
                          onChange={(event) => updateStartAnchor(shift, { dateKey: event.target.value })}
                        />
                      </Field>
                      <Field label="전반 근무자" className="min-w-0">
                        <Select
                          value={anchor.am}
                          onChange={(event) => updateStartAnchor(shift, { am: event.target.value })}
                        >
                          <option value="">선택</option>
                          {rotationPreview.map((workerName) => (
                            <option key={`${shift}-am-${workerName}`} value={workerName}>
                              {workerName}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="후반 근무자" className="min-w-0">
                        <Select
                          value={anchor.pm}
                          onChange={(event) => updateStartAnchor(shift, { pm: event.target.value })}
                        >
                          <option value="">선택</option>
                          {rotationPreview.map((workerName) => (
                            <option key={`${shift}-pm-${workerName}`} value={workerName}>
                              {workerName}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <div className="flex items-end">
                        <Button type="button" onClick={() => applyStartAnchor(anchor)} className="w-full">
                          기준 적용
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="2주 팀 라벨">
                <Select
                  value={state.twoWeekTeamRotation.enabled ? 'on' : 'off'}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      twoWeekTeamRotation: {
                        ...state.twoWeekTeamRotation,
                        enabled: event.target.value === 'on',
                      },
                    })
                  }
                >
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                </Select>
              </Field>
              <Field label="2주 라벨 기준일">
                <Input
                  type="date"
                  value={state.twoWeekTeamRotation.startDate}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      twoWeekTeamRotation: {
                        ...state.twoWeekTeamRotation,
                        startDate: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="2주 라벨 간격">
                <Input
                  type="number"
                  min={1}
                  value={state.twoWeekTeamRotation.intervalDays}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      twoWeekTeamRotation: {
                        ...state.twoWeekTeamRotation,
                        intervalDays: Number(event.target.value),
                      },
                    })
                  }
                />
              </Field>
              <Field label="2주 라벨 팀 순서">
                <Input
                  value={namesToText(state.twoWeekTeamRotation.teams)}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      twoWeekTeamRotation: {
                        ...state.twoWeekTeamRotation,
                        teams: parseNames(event.target.value),
                      },
                    })
                  }
                />
              </Field>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-bold text-slate-950">현재 순번 규칙</p>
              <p>근무일은 전반/후반을 배정하지만 다음 근무일 시작점은 1칸만 이동합니다.</p>
              <p>일요일, 기본 토요일, 휴무일은 OFF이며 순번 카운트를 증가시키지 않습니다.</p>
              <p>수동 전반/후반 변경일은 근무일로 보며 순번 카운트를 증가시킵니다.</p>
              <p>야간 주차는 표시되는 C조 3명을 전반/후반 후보에서 제외하고 다음 순번자를 배정합니다.</p>
            </div>
          </div>
        ) : null}

        {activeTab === 'sealer' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="내판실러 표시">
              <Select
                value={state.sealerRotation.enabled ? 'on' : 'off'}
                onChange={(event) =>
                  onChange({
                    ...state,
                    sealerRotation: {
                      ...state.sealerRotation,
                      enabled: event.target.value === 'on',
                    },
                  })
                }
              >
                <option value="on">ON</option>
                <option value="off">OFF</option>
              </Select>
            </Field>
            <Field label="기준일">
              <Input
                type="date"
                value={state.sealerRotation.startDate}
                onChange={(event) =>
                  onChange({
                    ...state,
                    sealerRotation: {
                      ...state.sealerRotation,
                      startDate: event.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="로테이션 간격">
              <Input
                type="number"
                min={1}
                value={state.sealerRotation.intervalDays}
                onChange={(event) =>
                  onChange({
                    ...state,
                    sealerRotation: {
                      ...state.sealerRotation,
                      intervalDays: Number(event.target.value),
                    },
                  })
                }
              />
            </Field>
            <Field label="팀 순서">
              <Input
                value={namesToText(state.sealerRotation.teams)}
                onChange={(event) =>
                  onChange({
                    ...state,
                    sealerRotation: {
                      ...state.sealerRotation,
                      teams: parseNames(event.target.value),
                    },
                  })
                }
              />
            </Field>
          </div>
        ) : null}

        {activeTab === 'theme' ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="테마 색상">
              <Input
                type="color"
                value={state.ui.themeColor}
                onChange={(event) =>
                  onChange({
                    ...state,
                    ui: {
                      ...state.ui,
                      themeColor: event.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="PDF 배율">
              <Input
                type="number"
                min={50}
                max={150}
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
              />
            </Field>
            <Field label="보기 방식">
              <Select
                value={state.ui.viewMode}
                onChange={(event) =>
                  onChange({
                    ...state,
                    ui: {
                      ...state.ui,
                      viewMode: event.target.value as CCRCalendarState['ui']['viewMode'],
                    },
                  })
                }
              >
                <option value="month">월간</option>
                <option value="year">연간</option>
              </Select>
            </Field>
          </div>
        ) : null}
          </section>

        <div className="flex justify-between border-t border-slate-200 pt-4">
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (confirm('팀원/C조/규칙 설정을 기본값으로 되돌릴까요? 날짜별 메모와 휴무는 유지됩니다.')) {
                onChange({
                  ...state,
                  dayTeams: DEFAULT_STATE.dayTeams,
                  cTeams: DEFAULT_STATE.cTeams,
                  monthCTeams: DEFAULT_STATE.monthCTeams,
                  monthStartPointer: DEFAULT_STATE.monthStartPointer,
                  monthStartAnchors: DEFAULT_STATE.monthStartAnchors,
                  monthStartWithNight: DEFAULT_STATE.monthStartWithNight,
                  saturdayDefaultOff: DEFAULT_STATE.saturdayDefaultOff,
                  materialRule: DEFAULT_STATE.materialRule,
                  cTeamExcludeMode: DEFAULT_STATE.cTeamExcludeMode,
                  sealerRotation: DEFAULT_STATE.sealerRotation,
                  twoWeekTeamRotation: DEFAULT_STATE.twoWeekTeamRotation,
                  ui: {
                    ...state.ui,
                    themeColor: DEFAULT_STATE.ui.themeColor,
                    pdfScale: DEFAULT_STATE.ui.pdfScale,
                  },
                });
              }
            }}
          >
            설정 기본값 복원
          </Button>
          <Button type="button" onClick={onClose}>
            저장 후 닫기
          </Button>
        </div>
        </div>
      </div>
    </Modal>
  );
}
