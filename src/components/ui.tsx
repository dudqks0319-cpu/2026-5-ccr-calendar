import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  const variants = {
    primary: 'bg-[#003D82] text-white hover:bg-[#0b4e9d] border-[#003D82]',
    secondary: 'bg-white text-[#172033] hover:bg-slate-50 border-slate-200',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 border-transparent',
    danger: 'bg-white text-red-700 hover:bg-red-50 border-red-200',
  };

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-semibold text-slate-700 ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-11 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/15 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`min-h-11 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/15 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/15 ${className}`}
      {...props}
    />
  );
}

export function Modal({
  title,
  children,
  onClose,
  width = 'max-w-3xl',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid items-end bg-slate-950/45 p-0 sm:place-items-center sm:p-3">
      <div className={`max-h-[94vh] w-full overflow-hidden rounded-t-xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-lg ${width}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <Button type="button" variant="ghost" onClick={onClose} aria-label="닫기">
            닫기
          </Button>
        </div>
        <div className="max-h-[calc(94vh-72px)] overflow-auto p-4 sm:max-h-[calc(92vh-72px)] sm:p-5">{children}</div>
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'blue' | 'orange' | 'green' | 'red' | 'violet';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-100 text-orange-800',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}
