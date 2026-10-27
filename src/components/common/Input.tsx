import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => (
  <div className="space-y-1">
    {label && <label className="block text-xs font-bold text-slate-700">{label}</label>}
    <input
      className={`w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all ${
        error ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-100' : ''
      } ${className}`}
      {...props}
    />
    {error ? (
      <p className="text-[11px] text-rose-600 font-medium">{error}</p>
    ) : helperText ? (
      <p className="text-[11px] text-slate-500 font-normal">{helperText}</p>
    ) : null}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: React.ReactNode;
  options?: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  children,
  className = '',
  ...props
}) => (
  <div className="space-y-1">
    {label && <label className="block text-xs font-bold text-slate-700">{label}</label>}
    <select
      className={`w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer ${
        error ? 'border-rose-400' : ''
      } ${className}`}
      {...props}
    >
      {Array.isArray(options)
        ? options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
    {error ? (
      <p className="text-[11px] text-rose-600 font-medium">{error}</p>
    ) : helperText ? (
      <p className="text-[11px] text-slate-500 font-normal">{helperText}</p>
    ) : null}
  </div>
);
