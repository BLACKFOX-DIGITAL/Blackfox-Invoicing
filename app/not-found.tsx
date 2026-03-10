"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { SearchX, Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <Card className="max-w-md w-full p-10 border-border-subtle bg-bg-surface shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-border-subtle" />

                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-bg-app rounded-2xl flex items-center justify-center mb-8 rotate-3 transition-transform hover:rotate-0">
                        <SearchX className="text-text-muted" size={40} />
                    </div>

                    <h2 className="text-3xl font-black text-text-main mb-3 tracking-tight">Page Not Found</h2>
                    <p className="text-text-muted text-lg mb-10 leading-relaxed">
                        We searched high and low, but couldn't find the page you were looking for.
                    </p>

                    <Link href="/" className="w-full">
                        <Button
                            className="w-full flex items-center justify-center gap-3 py-7 text-lg font-bold shadow-lg shadow-primary/10 transition-all hover:scale-[1.02]"
                        >
                            <Home size={20} /> Back to Dashboard
                        </Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
}
