"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { AlertOctagon, RefreshCcw } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang="en">
            <body className="bg-bg-app min-h-screen flex items-center justify-center p-6 font-sans antialiased text-text-main">
                <div className="max-w-lg w-full bg-white p-10 rounded-2xl shadow-2xl border border-gray-100 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-8 mx-auto">
                        <AlertOctagon className="text-red-500" size={40} />
                    </div>

                    <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Critical Error</h1>
                    <p className="text-gray-500 text-lg mb-10 leading-relaxed">
                        Something went properly wrong. The application has encountered a critical error and cannot recover.
                    </p>

                    <Button
                        onClick={() => reset()}
                        className="w-full flex items-center justify-center gap-3 py-4 text-lg font-bold bg-gray-900 text-white hover:bg-gray-800"
                    >
                        <RefreshCcw size={20} /> Try Again
                    </Button>

                    {error.digest && (
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                                Error Digest: {error.digest}
                            </p>
                        </div>
                    )}
                </div>
            </body>
        </html>
    );
}
