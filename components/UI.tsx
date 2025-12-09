import React from 'react';
import { LucideIcon } from 'lucide-react';

// Modern Zinc Palette & Design Tokens
// Usamos transparência para efeito Glassmorphism
const BG_CARD = 'bg-zinc-900/60 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-900/60'; 
const BG_INPUT = 'bg-zinc-950/80'; 
const BORDER_COLOR = 'border-zinc-800/60'; 
const TEXT_PRIMARY = 'text-zinc-100';
const TEXT_SECONDARY = 'text-zinc-400';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  icon?: LucideIcon;
  className?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, title, icon: Icon, className = '', headerAction }) => (
  <div className={`${BG_CARD} border ${BORDER_COLOR} rounded-2xl shadow-xl shadow-black/20 ${className} overflow-hidden transition-all duration-300`}>
    {(title || Icon) && (
      <div className={`flex items-center justify-between px-6 py-5 border-b ${BORDER_COLOR} bg-white/5`}>
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-[#00ffae]" />}
          {title && <h3 className={`text-[15px] font-semibold ${TEXT_PRIMARY} tracking-tight uppercase`}>{title}</h3>}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, size = 'md' }) => (
  <div className="flex items-center justify-between gap-4 group">
    {label && <span className={`${TEXT_PRIMARY} font-medium text-sm group-hover:text-white transition-colors`}>{label}</span>}
    <button
      onClick={() => onChange(!checked)}
      className={`relative rounded-full transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-[#00ffae]/50
        ${size === 'sm' ? 'w-10 h-5' : 'w-12 h-6'}
        ${checked ? 'bg-[#00ffae] shadow-[0_0_10px_-2px_#00ffae]' : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600'}
      `}
    >
      <span
        className={`absolute top-[2px] left-[2px] rounded-full bg-zinc-950 shadow-sm transform transition-transform duration-300
          ${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}
          ${checked 
            ? (size === 'sm' ? 'translate-x-5' : 'translate-x-6') 
            : 'translate-x-0 bg-zinc-400'}
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
    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">{label}</label>
    <div className="relative group">
      <input
        className={`w-full ${BG_INPUT} ${TEXT_PRIMARY} border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200 placeholder-zinc-700/50 ${className}
          ${error 
            ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-red-100' 
            : `${BORDER_COLOR} hover:border-zinc-700 focus:border-[#00ffae] focus:ring-1 focus:ring-[#00ffae]/20 focus:bg-zinc-900`
          }
        `}
        {...props}
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-mono pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
    {error && <span className="text-xs text-red-400 ml-1 font-medium flex items-center gap-1 animate-pulse">
      <span className="w-1 h-1 rounded-full bg-red-400 inline-block"/>
      {error}
    </span>}
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">{label}</label>
    <textarea
      className={`w-full ${BG_INPUT} ${TEXT_PRIMARY} border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200 placeholder-zinc-700/50 min-h-[120px] font-mono leading-relaxed ${className}
        ${error 
          ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' 
          : `${BORDER_COLOR} hover:border-zinc-700 focus:border-[#00ffae] focus:ring-1 focus:ring-[#00ffae]/20 focus:bg-zinc-900`
        }
      `}
      {...props}
    />
    {error && <span className="text-xs text-red-400 ml-1">{error}</span>}
  </div>
);

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  subLabel?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, subLabel }) => (
  <label className="flex items-start gap-3 cursor-pointer group select-none p-3 -ml-3 rounded-xl hover:bg-zinc-800/30 transition-colors">
    <div className="relative flex items-center mt-0.5">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className={`
        w-5 h-5 border rounded-md transition-all duration-200 flex items-center justify-center
        ${checked 
          ? 'bg-[#00ffae] border-[#00ffae] text-black shadow-[0_0_10px_-3px_#00ffae]' 
          : 'bg-zinc-950/50 border-zinc-700 group-hover:border-zinc-500'}
      `}>
        {checked && (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
    <div className="flex flex-col">
      <span className={`text-sm font-medium transition-colors leading-tight ${checked ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
        {label}
      </span>
      {subLabel && <span className="text-xs text-zinc-500 mt-1 leading-normal">{subLabel}</span>}
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
    px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm
    ${active 
      ? 'bg-[#00ffae]/10 text-[#00ffae] border-[#00ffae]/20 shadow-[#00ffae]/10' 
      : 'bg-zinc-800/50 text-zinc-500 border-zinc-800'}
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
            relative p-4 rounded-xl border text-left transition-all duration-200 group
            ${isSelected 
              ? 'bg-zinc-900/80 border-[#00ffae]/50 shadow-[0_0_15px_-10px_#00ffae]' 
              : 'bg-zinc-950/40 border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/50'}
          `}
        >
          <div className="flex items-center justify-between mb-1.5">
             <span className={`text-sm font-semibold ${isSelected ? 'text-[#00ffae]' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                {option.label}
             </span>
             {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#00ffae] shadow-[0_0_5px_#00ffae]" />}
          </div>
          {option.description && (
             <p className={`text-xs leading-relaxed ${isSelected ? 'text-zinc-400' : 'text-zinc-600 group-hover:text-zinc-500'}`}>
                {option.description}
             </p>
          )}
        </button>
      );
    })}
  </div>
);