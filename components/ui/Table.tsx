import React from "react";
import { clsx } from "clsx";

interface TableProps<T> {
    headers: React.ReactNode[];
    data: T[];
    renderRow: (row: T, index: number) => React.ReactNode;
    alignments?: ("left" | "center" | "right")[];
    footer?: React.ReactNode;
}

export default function Table<T>({ headers, data, renderRow, alignments, footer }: TableProps<T>) {
    return (
        <div className="w-full overflow-hidden rounded-2xl bg-bg-card border border-border-subtle/50">
            <div className="overflow-x-auto">
                <table className="w-full min-w-max text-left text-sm mobile-table">
                    <thead className="bg-primary text-white font-semibold text-[13px] tracking-wide border-b border-border-subtle">
                        <tr>
                            {headers.map((h, i) => {
                                const alignment = alignments?.[i] || "left";
                                return (
                                    <th
                                        key={i}
                                        className={clsx(
                                            "px-6 py-4 first:pl-8 last:pr-8",
                                            alignment === "right" && "text-right",
                                            alignment === "center" && "text-center"
                                        )}
                                    >
                                        {h}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-text-main">
                        {data.map((row, i) => (
                            <React.Fragment key={i}>
                                {renderRow(row, i)}
                            </React.Fragment>
                        ))}
                    </tbody>
                    {footer && (
                        <tfoot className="border-t-2 border-border-strong bg-background font-semibold text-text-main">
                            {footer}
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
