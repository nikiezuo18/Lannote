import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-5 py-3.5 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 tracking-wide";
  
  const variants = {
    primary: "bg-ink-500 text-white hover:bg-ink-600 shadow-lg shadow-ink-500/20 border-b-4 border-ink-700 active:border-b-0 active:translate-y-1",
    secondary: "bg-white text-ink-700 border-2 border-paper-200 hover:bg-paper-50 shadow-sm hover:border-ink-200",
    danger: "bg-white text-sticker-600 hover:bg-sticker-50 border-2 border-sticker-100",
    ghost: "bg-transparent text-ink-400 hover:bg-ink-50 hover:text-ink-600",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  );
};