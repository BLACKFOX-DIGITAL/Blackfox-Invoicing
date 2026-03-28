"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { LogIn, ShieldCheck, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | undefined>();
    const [isPending, setIsPending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPending(true);
        setError(undefined);
        try {
            const res: any = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });
            if (res?.error) {
                setError("Invalid email or password.");
            } else {
                window.location.href = "/dashboard";
            }
        } catch (err: any) {
            setError(err.message || "Invalid email or password.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-700" />
            </div>

            <Card className="w-full max-w-md p-8 relative z-10 border-border-subtle shadow-2xl backdrop-blur-md bg-bg-card/80">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-inner">
                        <Lock className="text-primary" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-text-main tracking-tight">Welcome Back</h1>
                    <p className="text-text-muted text-sm mt-1">Please enter your details to sign in</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Email Address"
                        name="email"
                        type="email"
                        placeholder="admin@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        startIcon={<Mail size={18} className="text-text-muted" />}
                        required
                        className="bg-bg-surface/50"
                    />

                    <div className="space-y-1">
                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            startIcon={<Lock size={18} className="text-text-muted" />}
                            required
                            className="bg-bg-surface/50"
                        />
                        <div className="flex justify-end">
                            <button type="button" className="text-xs text-primary hover:text-primary-hover transition-colors font-medium">
                                Forgot password?
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-xs flex items-center gap-2 animate-in fade-in duration-300">
                            <ShieldCheck size={14} />
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full py-6 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        disabled={isPending}
                    >
                        {isPending ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <LogIn size={18} />
                        )}
                        {isPending ? "Signing In..." : "Sign In"}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-border-subtle text-center">
                    <p className="text-text-muted text-xs">
                        Don't have an account? <span className="text-primary font-semibold cursor-pointer hover:underline">Contact Administrator</span>
                    </p>
                </div>
            </Card>
        </div>
    );
}
