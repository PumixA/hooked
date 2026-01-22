import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export default function Card({ children, className, onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={twMerge(
                "bg-secondary p-4 rounded-2xl border border-zinc-700/50",
                onClick && "cursor-pointer hover:border-zinc-600 transition-colors",
                className
            )}
        >
            {children}
        </div>
    );
}