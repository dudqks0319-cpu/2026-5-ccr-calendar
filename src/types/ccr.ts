export type TeamKey = 'conveyor' | 'robot' | 'main';

export type TeamConfig = {
  label: string;
  members: string[];
};

export type CTeamDepartments = Partial<Record<TeamKey, string[]>>;

export type CTeamKey = 'A' | 'B' | 'C' | 'D' | 'E';

export type CTeamConfig = {
  label: string;
  members: string[];
  departments?: CTeamDepartments;
};

export type CTeamExcludeMode = 'always' | 'nightOnly' | 'none';

export type MaterialMode = 'fixed' | 'date' | 'rotation';

export type MaterialRule = {
  enabled: boolean;
  excludeOnDayShift: boolean;
  mode: MaterialMode;
  fixedWorkerName: string;
  dateWorkers: Record<string, string>;
  rotationOrder: string[];
};

export type DayOverride = {
  am?: string;
  pm?: string;
  isOff?: boolean;
  cTeamText?: string;
  materialWorker?: string;
  isSaturdayOvertime?: boolean;
  comment?: string;
  holidayName?: string;
  weekTeamLabel?: string;
  specialWorkLabel?: string;
  userComment?: string;
};

export type SealerRotation = {
  enabled: boolean;
  startDate: string;
  teams: string[];
  intervalDays: number;
};

export type TwoWeekTeamRotation = {
  enabled: boolean;
  startDate: string;
  teams: string[];
  intervalDays: number;
};

export type CalendarViewMode = 'month' | 'year';

export type CalendarDay = {
  dateKey: string;
  day: number;
  dayOfWeek: number;
  isOff: boolean;
  isManualOff: boolean;
  isNight: boolean;
  am: string;
  pm: string;
  cTeamText: string;
  materialWorker: string;
  isSaturdayOvertime: boolean;
  sealerTeam: string;
  comment: string;
  holidayName: string;
  weekTeamLabel: string;
  specialWorkLabel: string;
  userComment: string;
};

export type MonthSchedule = {
  year: number;
  monthIndex: number;
  firstDayOfMonthWeekday: number;
  days: CalendarDay[];
};

export type CCRCalendarState = {
  version: 2;
  selectedYear: number;
  selectedMonthIndex: number;
  startWithNight: boolean;
  monthStartWithNight: Record<string, boolean>;
  monthCTeams: Record<string, string[]>;
  monthStartPointer: Record<string, number>;
  selectedCTeamKey: CTeamKey;
  dayTeams: Record<TeamKey, TeamConfig>;
  cTeams: Record<CTeamKey, CTeamConfig>;
  materialRule: MaterialRule;
  cTeamExcludeMode: CTeamExcludeMode;
  saturdayDefaultOff: boolean;
  offDays: Record<string, boolean>;
  overrides: Record<string, DayOverride>;
  comments: Record<string, string>;
  monthMemo: Record<string, string>;
  saturdayOvertime: Record<string, boolean>;
  sealerRotation: SealerRotation;
  twoWeekTeamRotation: TwoWeekTeamRotation;
  ui: {
    darkMode: boolean;
    themeColor: string;
    pdfScale: number;
    viewMode: CalendarViewMode;
  };
  updatedAt: string;
};

export type WorkerStats = {
  workerName: string;
  total: number;
  am: number;
  pm: number;
  dayShift: number;
  nightShift: number;
  material: number;
  cTeam: number;
};
