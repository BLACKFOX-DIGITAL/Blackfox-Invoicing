"use client";

import Button from "@/components/ui/Button";
import { AlertCircle, X } from "lucide-react";
import { clsx } from "clsx";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
}

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName }: DeleteConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-bg-card rounded-xl shadow-xl w-full max-w-md border border-border-subtle overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-status-error/10 flex items-center justify-center text-status-error mb-2">
                        <AlertCircle size={24} />
                    </div>

                    <h3 className="text-xl font-bold text-text-main">Delete {itemName}?</h3>

                    <p className="text-text-muted text-sm leading-relaxed">
                        Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone and will remove all associated data.
                    </p>
                </div>

                <div className="p-4 bg-bg-surface border-t border-border-subtle flex gap-3 justify-center">
                    <Button variant="ghost" onClick={onClose} className="w-full">
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="w-full bg-status-error hover:bg-red-600 text-white border-transparent"
                    >
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}
