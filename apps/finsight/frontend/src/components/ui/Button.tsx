import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-xs',
    lg: 'px-4 py-2 text-sm',
  };

  const variantClasses = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-black shadow-2xs border border-slate-900',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200/80 active:bg-slate-300 border border-slate-200/80',
    outline: 'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border border-slate-300/90 shadow-2xs',
    danger: 'bg-rose-700 text-white hover:bg-rose-800 active:bg-rose-900 shadow-2xs border border-transparent',
    success: 'bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900 shadow-2xs border border-transparent',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200 border-none',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
