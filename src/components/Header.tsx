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
    <header className="no-print z-30 border-b border-slate-200 bg-white/95 backdrop-blur md:sticky md:top-0">
      <div className="mx-auto grid max-w-[1480px] gap-3 px-3 py-2 sm:px-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-[#003D82] text-base font-black text-white">
            CCR
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-normal text-slate-950">CCR 캘린더</h1>
            <p className="truncate text-xs font-semibold text-slate-500">{autosaveStatus}</p>
          </div>
        </div>

        <div className="hidden justify-center text-xs font-bold text-slate-500 lg:flex">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            로컬 자동저장 · 선택 서버저장
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(220px,280px)_auto] sm:items-center lg:justify-self-end">
          <Input
            type="search"
            placeholder="근무자 검색"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="min-h-11 w-full text-base sm:text-sm"
          />
          <div className="mobile-action-scroll flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
            <Button type="button" variant="secondary" onClick={onOpenStats} className="h-11 shrink-0 whitespace-nowrap">
              통계
            </Button>
            <Button type="button" variant="secondary" onClick={onOpenSettings} className="h-11 shrink-0 whitespace-nowrap">
              설정
            </Button>
            <Button type="button" variant="secondary" onClick={onOpenBackup} className="h-11 shrink-0 whitespace-nowrap">
              백업
            </Button>
            <Button type="button" variant="secondary" onClick={onExportPdf} className="h-11 shrink-0 whitespace-nowrap">
              PDF
            </Button>
            <Button type="button" variant="secondary" onClick={onExportExcel} className="h-11 shrink-0 whitespace-nowrap">
              Excel
            </Button>
            <Button type="button" variant="secondary" onClick={onPrint} className="h-11 shrink-0 whitespace-nowrap">
              인쇄
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
