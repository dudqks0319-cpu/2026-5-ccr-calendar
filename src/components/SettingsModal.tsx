import { useMemo, useState } from 'react';
import type { CCRCalendarState, CTeamExcludeMode, CTeamKey, MaterialMode, TeamKey } from '../types/ccr.js';
import { C_TEAM_KEYS, DEFAULT_STATE, TEAM_KEYS } from '../constants/defaults.js';
import { buildBaseRotation } from '../logic/buildBaseRotation.js';
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

function parseNames(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function namesToText(names: string[]) {
  return names.join(', ');
}

export function SettingsModal({ state, onChange, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('teams');
  const rotationPreview = useMemo(() => buildBaseRotation(state.dayTeams), [state.dayTeams]);

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

  return (
    <Modal title="설정" onClose={onClose} width="max-w-5xl">
      <div className="grid gap-5">
        <div className="no-print flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              variant={activeTab === tab.key ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
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
            <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
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
          <div className="grid gap-3 md:grid-cols-2">
            {C_TEAM_KEYS.map((teamKey) => (
              <Field key={teamKey} label={`${state.cTeams[teamKey].label} 멤버`}>
                <Textarea
                  value={namesToText(state.cTeams[teamKey].members)}
                  onChange={(event) => updateCTeam(teamKey, event.target.value)}
                />
              </Field>
            ))}
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-bold text-slate-950">현재 순번 규칙</p>
              <p>근무일은 전반/후반을 배정하지만 다음 근무일 시작점은 1칸만 이동합니다.</p>
              <p>일요일 또는 휴무일은 OFF이며 순번 카운트를 증가시키지 않습니다.</p>
              <p>수동 전반/후반 변경일은 근무일로 보며 순번 카운트를 증가시킵니다.</p>
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
                  materialRule: DEFAULT_STATE.materialRule,
                  cTeamExcludeMode: DEFAULT_STATE.cTeamExcludeMode,
                  sealerRotation: DEFAULT_STATE.sealerRotation,
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
    </Modal>
  );
}
