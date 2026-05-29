import type { CCRCalendarState } from '../types/ccr.js';

export const STORAGE_KEY = 'ccr_calendar_v2';

export const DEFAULT_STATE: CCRCalendarState = {
  version: 2,
  selectedYear: 2026,
  selectedMonthIndex: 4,
  startWithNight: false,
  monthStartWithNight: {},
  monthCTeamKeys: {
    '2026-05': 'A',
    '2026-06': 'A',
  },
  monthCTeams: {
    '2026-04': ['선우', '영빈', '우용'],
    '2026-05': ['민성', '서용', '재령'],
    '2026-06': ['민성', '서용', '재령'],
  },
  monthStartPointer: {
    '2026-04': 13,
    '2026-05': 10,
    '2026-06': 6,
  },
  monthStartAnchors: {},
  selectedCTeamKey: 'A',
  dayTeams: {
    conveyor: {
      label: '컨베어',
      members: ['호빈', '민성', '동인', '선우', '윤수'],
    },
    robot: {
      label: '로보트',
      members: ['광수', '영빈', '서용', '찬우', '성광'],
    },
    main: {
      label: '주설비',
      members: ['우용', '재령', '민혁', '이진', '성운', '승현'],
    },
  },
  cTeams: {
    A: {
      label: 'A팀',
      members: ['민성', '광수', '이진'],
      departments: {
        conveyor: ['민성'],
        robot: ['광수'],
        main: ['이진'],
      },
    },
    B: {
      label: 'B팀',
      members: ['호빈', '찬우', '성운'],
      departments: {
        conveyor: ['호빈'],
        robot: ['찬우'],
        main: ['성운'],
      },
    },
    C: {
      label: 'C팀',
      members: ['선우', '서용', '우용'],
      departments: {
        conveyor: ['선우'],
        robot: ['서용'],
        main: ['우용'],
      },
    },
    D: {
      label: 'D팀',
      members: ['동인', '영빈', '민혁'],
      departments: {
        conveyor: ['동인'],
        robot: ['영빈'],
        main: ['민혁'],
      },
    },
    E: {
      label: 'E팀',
      members: ['윤수', '성광', '재령'],
      departments: {
        conveyor: ['윤수'],
        robot: ['성광'],
        main: ['재령'],
      },
    },
  },
  materialRule: {
    enabled: true,
    excludeOnDayShift: true,
    mode: 'fixed',
    fixedWorkerName: '',
    dateWorkers: {},
    rotationOrder: [],
  },
  cTeamExcludeMode: 'nightOnly',
  saturdayDefaultOff: true,
  offDays: {},
  overrides: {},
  comments: {},
  monthMemo: {},
  saturdayOvertime: {},
  serverSave: {
    saveKey: '',
    updatedAt: '',
    revision: 0,
  },
  sealerRotation: {
    enabled: true,
    startDate: '2025-01-05',
    teams: ['컨베어팀', '로보트팀', '주설비팀'],
    intervalDays: 14,
  },
  twoWeekTeamRotation: {
    enabled: true,
    startDate: '2026-04-06',
    teams: ['컨베어', '로보트', '주설비'],
    intervalDays: 14,
  },
  ui: {
    darkMode: false,
    themeColor: '#003D82',
    pdfScale: 95,
    viewMode: 'month',
  },
  updatedAt: new Date().toISOString(),
};

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export const C_TEAM_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;

export const TEAM_KEYS = ['conveyor', 'robot', 'main'] as const;
