import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    isLoading?: boolean;
    icon?: ReactNode;
}

export default function Button({
                                   children,
                                   variant = 'primary',
                                   isLoading = false,
                                   icon,
                                   className,
                                   disabled,
                                   ...props
                               }: ButtonProps) {

    const baseStyles = "w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-primary text-background hover:opacity-90",
        secondary: "bg-secondary text-white border border-zinc-700 hover:bg-zinc-700",
        danger: "bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20",
        ghost: "bg-transparent text-gray-400 hover:text-white"
    };

    return (
        <button
            className={twMerge(clsx(baseStyles, variants[variant], className))}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : icon}
            {children}
        </button>
    );
}