import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseClass = "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-bold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]";
    
    const variants = {
      default: "bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white shadow-xl shadow-indigo-200 hover:scale-[1.02]",
      secondary: "bg-white text-indigo-600 shadow-sm border border-slate-100 hover:text-indigo-700 hover:bg-slate-50",
      outline: "border-2 border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700",
      ghost: "hover:bg-slate-100 text-slate-500 hover:text-slate-700",
      danger: "bg-red-50 text-red-600 hover:bg-red-100",
    };
    
    const sizes = {
      sm: "h-9 px-4 text-xs",
      md: "h-11 px-6 text-sm",
      lg: "h-14 px-8 text-base",
      icon: "h-11 w-11 hover:scale-[1.02]",
    };

    return (
      <button
        ref={ref}
        className={cn(baseClass, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
