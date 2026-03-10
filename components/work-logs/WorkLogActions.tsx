"use client";

import Button from "@/components/ui/Button";
import { X, AlertCircle } from "lucide-react";

interface DeleteWorkLogModalProps {
    logId: number | string;
    isBulk?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const overlayClass = "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm";
const modalClass = "bg-bg-card rounded-2xl shadow-xl w-full max-w-sm border border-border-subtle animate-in fade-in zoom-in-95 duration-200";
const headerClass = "flex justify-between items-center p-4 border-b border-border-subtle";
const titleClass = "text-lg font-bold text-text-main";

export function DeleteWorkLogModal({ logId, isBulk, onClose, onConfirm }: DeleteWorkLogModalProps) {
    return (
        <div className={overlayClass}>
            <div className={modalClass}>
                <div className={headerClass}>
                    <h2 className={titleClass}>{isBulk ? "Delete Selected Logs?" : "Delete Work Log?"}</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    <div className="bg-status-error/10 p-4 rounded-lg flex items-start gap-3 mb-4">
                        <div className="text-status-error mt-0.5"><AlertCircle size={20} /></div>
                        <div className="text-sm text-text-main">
                            <p className="font-bold mb-1">This action cannot be undone.</p>
                            {isBulk ? (
                                <p><span className="font-mono font-bold">{logId}</span> work logs will be permanently deleted.</p>
                            ) : (
                                <p>Work log #<span className="font-mono font-bold">{logId}</span> will be permanently deleted.</p>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-text-muted mb-6">Are you sure you want to proceed?</p>

                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={onConfirm}
                            className="bg-status-error hover:bg-status-error/90 text-white border-transparent"
                        >
                            {isBulk ? "Delete Selected" : "Delete Log"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
