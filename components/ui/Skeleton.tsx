import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={twMerge(clsx("animate-pulse rounded-md bg-gray-200/80", className))}
            {...props}
        />
    );
}

export { Skeleton };
