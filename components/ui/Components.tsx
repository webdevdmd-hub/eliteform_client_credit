import React, { InputHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className, title }) => (
  <div className={cn("bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden", className)}>
    {title && <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50"><h3 className="font-semibold text-stone-700">{title}</h3></div>}
    <div className="p-6">{children}</div>
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
  const variants = {
    primary: "bg-stone-800 text-white hover:bg-stone-700 shadow-md shadow-stone-200",
    secondary: "bg-primary-100 text-primary-900 hover:bg-primary-200",
    outline: "border-2 border-stone-200 text-stone-600 hover:border-stone-800 hover:text-stone-800",
    ghost: "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
  };
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-5 py-2.5", lg: "px-8 py-3 text-lg" };

  return (
    <button 
      ref={ref}
      className={cn("rounded-lg font-medium transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed", variants[variant], sizes[size], className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <span className="animate-spin mr-2">⟳</span> : null}
      {children}
    </button>
  );
});

// --- Input ---
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-stone-600 mb-1.5">{label}</label>}
    <input
      ref={ref}
      className={cn(
        "w-full px-4 py-2.5 rounded-lg border bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all",
        error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
        className
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
  </div>
));

// --- Checkbox ---
export const Checkbox = forwardRef<HTMLInputElement, InputProps>(({ label, className, ...props }, ref) => (
  <label className="flex items-center space-x-3 cursor-pointer group">
    <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
    <div className="w-5 h-5 rounded border border-stone-300 peer-checked:bg-stone-800 peer-checked:border-stone-800 transition-colors flex items-center justify-center text-white">
      <svg className="w-3.5 h-3.5 opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    {label && <span className="text-sm text-stone-600 group-hover:text-stone-900 select-none">{label}</span>}
  </label>
));
