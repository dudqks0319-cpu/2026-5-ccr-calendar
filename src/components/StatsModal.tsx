import type { WorkerStats } from '../types/ccr.js';
import { Modal } from './ui.js';

type StatsModalProps = {
  title: string;
  stats: WorkerStats[];
  onClose: () => void;
};

export function StatsModal({ title, stats, onClose }: StatsModalProps) {
  return (
    <Modal title={title} onClose={onClose} width="max-w-5xl">
      <div className="overflow-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {['근무자', '총 근무', '전반', '후반', '주간', '야간', '자재담당', 'C조'].map((header) => (
                <th key={header} className="border-b border-slate-200 px-3 py-2 text-left font-black">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((row) => (
              <tr key={row.workerName} className="hover:bg-blue-50">
                <td className="border-b border-slate-100 px-3 py-2 font-black text-slate-950">
                  {row.workerName}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">{row.total}</td>
                <td className="border-b border-slate-100 px-3 py-2">{row.am}</td>
                <td className="border-b border-slate-100 px-3 py-2">{row.pm}</td>
                <td className="border-b border-slate-100 px-3 py-2">{row.dayShift}</td>
                <td className="border-b border-slate-100 px-3 py-2">{row.nightShift}</td>
                <td className="border-b border-slate-100 px-3 py-2">{row.material}</td>
                <td className="border-b border-slate-100 px-3 py-2">{row.cTeam}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
