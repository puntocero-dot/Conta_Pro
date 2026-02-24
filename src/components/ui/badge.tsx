import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    const variants = {
        default: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        secondary: 'bg-slate-800 text-slate-300 border-slate-700',
        outline: 'bg-transparent text-slate-400 border-slate-800',
        destructive: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    return (
        <div
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${variants[variant]} ${className || ''}`}
            {...props}
        />
    )
}

export { Badge }
