import React from 'react';
import { LucideIcon } from 'lucide-react';

// Color Constants
const NEON_GREEN = '#00ffae';
const SOFT_RED = '#f87171';
const BG_CARD = 'bg-[#111827]';
const BORDER_COLOR = 'border-[#374151]';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  icon?: LucideIcon;
  className?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, title, icon: Icon, className = '', headerAction }) => (
  <div className={`${BG_CARD} border ${BORDER_COLOR} rounded-2xl p-6 shadow-lg ${className}`}>
    {(title || Icon) && (
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#374151]/50">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-gray-400" />}
          {title && <h3 className="text-lg font-semibold text-white tracking-wide">{title}</h3>}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
    )}
    {children}
  </div>
);

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, size = 'md' }) => (
  <div className="flex items-center justify-between gap-4">
    {label && <span className="text-gray-300 font-medium">{label}</span>}
    <button
      onClick={() => onChange(!checked)}
      className={`relative rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111827] focus:ring-[#00ffae]
        ${size === 'sm' ? 'w-10 h-5' : 'w-14 h-7'}
        ${checked ? 'bg-[#00ffae]/20 border border-[#00ffae]' : 'bg-gray-700 border border-gray-600'}
      `}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow-md transform transition-transform duration-300
          ${size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'}
          ${checked ? (size === 'sm' ? 'translate-x-5 bg-[#00ffae]' : 'translate-x-7 bg-[#00ffae]') : 'translate-x-0 bg-gray-400'}
        `}
      />
    </button>
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  suffix?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, suffix, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</label>
    <div className="relative group">
      <input
        className={`w-full bg-[#1f2937] text-white border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 transition-all duration-200 placeholder-gray-600 ${className}
          ${error 
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50 text-red-100' 
            : 'border-[#374151] focus:border-[#00ffae] focus:ring-[#00ffae]'
          }
        `}
        {...props}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
    {error && <span className="text-xs text-red-400 mt-0.5 font-medium">{error}</span>}
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</label>
    <textarea
      className={`w-full bg-[#1f2937] text-white border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 transition-all duration-200 placeholder-gray-600 min-h-[100px] ${className}
        ${error 
          ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' 
          : 'border-[#374151] focus:border-[#00ffae] focus:ring-[#00ffae]'
        }
      `}
      {...props}
    />
    {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
  </div>
);

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  subLabel?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, subLabel }) => (
  <label className="flex items-start gap-3 cursor-pointer group select-none">
    <div className="relative flex items-center mt-1">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className={`
        w-5 h-5 border-2 rounded transition-all duration-200 flex items-center justify-center
        ${checked 
          ? 'bg-[#00ffae] border-[#00ffae] text-black' 
          : 'bg-transparent border-gray-500 group-hover:border-gray-400'}
      `}>
        {checked && (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
    <div className="flex flex-col">
      <span className={`text-sm font-medium transition-colors ${checked ? 'text-white' : 'text-gray-400'}`}>
        {label}
      </span>
      {subLabel && <span className="text-xs text-gray-600 mt-0.5">{subLabel}</span>}
    </div>
  </label>
);

interface StatusBadgeProps {
  active: boolean;
  activeText?: string;
  inactiveText?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ active, activeText = 'Ativo', inactiveText = 'Desativado' }) => (
  <span className={`
    px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
    ${active 
      ? 'bg-[#00ffae]/10 text-[#00ffae] border-[#00ffae]/50 shadow-[0_0_10px_-3px_#00ffae]' 
      : 'bg-red-500/10 text-[#f87171] border-[#f87171]/50'}
  `}>
    {active ? activeText : inactiveText}
  </span>
);

interface SegmentedControlProps {
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (value: any) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    {options.map((option) => {
      const isSelected = value === option.value;
      return (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            relative p-3 rounded-xl border text-left transition-all duration-200
            ${isSelected 
              ? 'bg-[#00ffae]/10 border-[#00ffae] shadow-[0_0_10px_-5px_#00ffae]' 
              : 'bg-[#1f2937] border-[#374151] hover:border-gray-500'}
          `}
        >
          <div className="flex items-center justify-between mb-1">
             <span className={`text-sm font-bold ${isSelected ? 'text-[#00ffae]' : 'text-white'}`}>
                {option.label}
             </span>
             {isSelected && <div className="w-2 h-2 rounded-full bg-[#00ffae] shadow-[0_0_5px_#00ffae]" />}
          </div>
          {option.description && (
             <p className={`text-xs ${isSelected ? 'text-[#00ffae]/80' : 'text-gray-500'}`}>
                {option.description}
             </p>
          )}
        </button>
      );
    })}
  </div>
);
