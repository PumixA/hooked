import { InputHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className, ...props }, ref) => {
        return (
            <div className="space-y-1 w-full">
                {label && <label className="text-xs text-gray-400 ml-1">{label}</label>}
                <input
                    ref={ref}
                    className={twMerge(clsx(
                        "w-full p-4 rounded-xl bg-secondary border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                        className
                    ))}
                    {...props}
                />
                {error && <p className="text-xs text-red-400 ml-1">{error}</p>}
            </div>
        );
    }
);

Input.displayName = "Input";
export default Input;