# 2026 5월 CCR 캘린더

급여, 출퇴근, 승인 기능 없이 CCR 근무 순번과 달력 출력에 집중한 로컬 저장형 웹앱입니다.

## 포함 기능

- 2026년 4월/5월 A조 사진 기준 검증 프리셋
- 2026년 6월 A조 순번 프리셋
- CCR 전반/후반 순번 자동 배정
- 월별 C조 표시와 주간/야간 주차 표시
- 자재담당자 제외 규칙
- 토요일 기본 OFF, 생산특근 예외, 날짜별 수동 변경
- 내판실러 안착불량 14일 로테이션
- 컨베어/로보트/주설비 2주 팀 라벨 로테이션
- A/B/C/D/E C조의 로보트팀, 주설비팀, 컨베어팀별 팀원 설정
- 월 메모, 검색, 통계
- PDF, Excel 호환 파일, 인쇄
- 브라우저 localStorage 자동저장
- 로컬 JSON 파일 저장 모드
- JSON 백업 내보내기/불러오기
- Windows Electron 앱 패키징

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:5173/` 또는 터미널에 표시되는 주소를 엽니다.

## 빌드와 검증

```bash
npm test
npm run build
npm audit
```

`dist/index.html`은 정적 파일 경로가 상대 경로로 생성되도록 설정되어 있어, 빌드 후 정적 호스팅이나 파일 실행에 사용할 수 있습니다.

## 단일 HTML

```bash
npm run build:single
```

생성 파일:

```text
CCR캘린더_단일파일.html
```

이 파일 하나만 다른 PC로 전달해도 실행할 수 있습니다. 다만 브라우저 캐시나 localStorage가 자동 삭제되는 PC에서는 `백업/복원` 화면의 `로컬 파일 자동저장`에서 JSON 저장 파일을 연결하세요.

## Windows 앱 빌드

Windows 실행 파일은 GitHub Actions에서 만드는 방식을 권장합니다.

1. GitHub 저장소의 `Actions` 탭으로 이동
2. `Build Windows Electron App` 선택
3. `Run workflow` 실행
4. 완료 후 `CCR-Calendar-Windows-Portable` artifact 다운로드
5. 압축을 풀고 `CCR-Calendar-Windows-Portable-0.1.0.exe` 실행

로컬에서 Electron 앱을 확인할 때:

```bash
npm run electron:start
```

Windows portable exe 빌드 명령:

```bash
npm run electron:dist:win
```

macOS에서 Windows exe를 직접 빌드하려면 Electron 런타임 다운로드와 Windows 패키징 환경이 필요하므로, 실제 배포 파일은 GitHub Actions의 Windows runner에서 만드는 것이 가장 안정적입니다.

## 기본 데이터

앱을 처음 열면 2026년 6월 A조 화면으로 시작합니다.

- 제목: `2026년 6월 A조`
- C조: `민성 서용 재령`
- 메모: 사진 기준 협정 메모
- 저장 키: `ccr_calendar_v2`

6월 프리셋은 2026년 5월 30일 후반 `동인` 다음 순번부터 이어지며, 6월 토요일 생산특근은 없는 것으로 처리합니다. 2026년 6월 3일은 지방선거, 6월 6일은 현충일로 휴무 표시합니다.

사진 검증용 월별 데이터:

- `2026-04` C조: `선우 영빈 우용`
- `2026-05` C조: `민성 서용 재령`
- 토요일은 기본 OFF이며, `saturdayOvertime`이 켜진 토요일만 근무일로 처리합니다.
- 2주 팀 라벨은 `2026-04-06`부터 `컨베어 → 로보트 → 주설비` 순서로 계산합니다.

이미 브라우저에 저장된 값이 있으면 기존 localStorage 값이 우선 적용됩니다. 초기 화면을 다시 보려면 앱의 초기화 기능을 사용하거나 브라우저 저장 데이터를 지우면 됩니다.
