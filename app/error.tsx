"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <Card className="max-w-md w-full p-10 border-border-subtle bg-bg-surface shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-status-error/50" />

                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-status-error/5 rounded-2xl flex items-center justify-center mb-8 rotate-3 transition-transform hover:rotate-0">
                        <AlertTriangle className="text-status-error" size={40} />
                    </div>

                    <h2 className="text-3xl font-black text-text-main mb-3 tracking-tight">System Hiccup</h2>
                    <p className="text-text-muted text-lg mb-10 leading-relaxed">
                        We hit an unexpected snag. Our engineers have been pinged, but you can try refreshing to see if it clears up.
                    </p>

                    <div className="flex flex-col w-full gap-4">
                        <Button
                            onClick={() => reset()}
                            className="w-full flex items-center justify-center gap-3 py-7 text-lg font-bold shadow-lg shadow-primary/10 transition-all hover:scale-[1.02]"
                        >
                            <RefreshCcw size={20} className="animate-spin-slow" /> Retry Operation
                        </Button>

                        <Link href="/" className="w-full">
                            <Button
                                variant="ghost"
                                className="w-full flex items-center justify-center gap-3 py-7 text-lg font-bold border-border-subtle hover:bg-bg-app"
                            >
                                <Home size={20} /> Back to Dashboard
                            </Button>
                        </Link>
                    </div>

                    {error.digest && (
                        <div className="mt-12 pt-6 border-t border-border-subtle/50 w-full">
                            <p className="text-[10px] font-mono text-text-muted uppercase tracking-[0.2em] opacity-40">
                                Trace ID: {error.digest}
                            </p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
