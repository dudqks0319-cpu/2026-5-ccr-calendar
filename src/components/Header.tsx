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
      <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-[#003D82] text-lg font-black text-white">
            CCR
          </div>
          <div>
            <h1 className="text-xl font-black tracking-normal text-slate-950">CCR 캘린더</h1>
            <p className="text-xs font-medium text-slate-500">{autosaveStatus}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <Input
            type="search"
            placeholder="근무자 검색"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="w-full xl:w-52"
          />
          <div className="flex flex-wrap gap-2">
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
