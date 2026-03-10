import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from './Button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    title: string;
    description: string;
    icon: LucideIcon;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export default function EmptyState({
    title,
    description,
    icon: Icon,
    action,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-12 text-center rounded-xl border-2 border-dashed border-border-subtle bg-bg-surface/50 animate-in fade-in zoom-in duration-300",
            className
        )}>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Icon size={32} />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">{title}</h3>
            <p className="text-text-muted mb-8 max-w-sm">
                {description}
            </p>
            {action && (
                <Button onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}
