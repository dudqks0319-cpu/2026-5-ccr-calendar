import { Button, Input } from './ui.js';

type HeaderProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onOpenBackup: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
  autosaveStatus: string;
};

export function Header({
  searchTerm,
  onSearchTermChange,
  onOpenStats,
  onOpenSettings,
  onOpenBackup,
  onExportPdf,
  onExportExcel,
  onPrint,
  autosaveStatus,
}: HeaderProps) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-[1480px] gap-3 px-4 py-2 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-[#003D82] text-base font-black text-white">
            CCR
          </div>
          <div>
            <h1 className="text-lg font-black tracking-normal text-slate-950">CCR 캘린더</h1>
            <p className="text-xs font-semibold text-slate-500">{autosaveStatus}</p>
          </div>
        </div>

        <div className="hidden justify-center text-xs font-bold text-slate-500 lg:flex">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            로컬 자동저장 · 서버/로그인 없음
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(220px,280px)_auto] sm:items-center lg:justify-self-end">
          <Input
            type="search"
            placeholder="근무자 검색"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="w-full"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onOpenStats}>
              통계
            </Button>
            <Button type="button" variant="secondary" onClick={onOpenSettings}>
              설정
            </Button>
            <Button type="button" variant="secondary" onClick={onOpenBackup}>
              백업
            </Button>
            <Button type="button" variant="secondary" onClick={onExportPdf}>
              PDF
            </Button>
            <Button type="button" variant="secondary" onClick={onExportExcel}>
              Excel
            </Button>
            <Button type="button" variant="secondary" onClick={onPrint}>
              인쇄
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
