"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Card from "@/components/ui/Card"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import { ShieldCheck, Mail, Lock, User, Loader2 } from "lucide-react"

export default function SetupForm() {
    const router = useRouter()
    
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        // Using fetch to an API route or calling server action directly is complex from a client component due to Next 14+ behavior, 
        // so we'll do a simple fetch to an API route. Wait, actually I created a Server Action createSetupAdmin! Let's import it.
        try {
            const { createSetupAdmin } = await import("@/app/actions/setup")
            const response = await createSetupAdmin({ name, email, password })
            if (response?.error) {
                setError(response.error)
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred!")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="p-8 border-border-subtle shadow-2xl backdrop-blur-md bg-bg-card/80">
            <div className="flex flex-col items-center mb-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-inner">
                    <ShieldCheck className="text-primary" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-text-main tracking-tight">System Setup</h1>
                <p className="text-text-muted text-sm mt-1">Configure the Master Admin Account</p>
                <p className="text-xs text-status-warning mt-2 font-medium">This page will lock immediately after creation!</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                    label="Full Name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e: any) => setName(e.target.value)}
                    startIcon={<User size={18} className="text-text-muted" />}
                    required
                    className="bg-bg-surface/50"
                />
                
                <Input
                    label="Admin Email"
                    name="email"
                    type="email"
                    placeholder="admin@yourdomain.com"
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                    startIcon={<Mail size={18} className="text-text-muted" />}
                    required
                    className="bg-bg-surface/50"
                />

                <Input
                    label="Master Password (min 6 chars)"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    startIcon={<Lock size={18} className="text-text-muted" />}
                    required
                    minLength={6}
                    className="bg-bg-surface/50"
                />

                {error && (
                    <div className="p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-xs flex items-center gap-2 animate-in fade-in duration-300">
                        <ShieldCheck size={14} />
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full py-6 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 bg-primary"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <ShieldCheck size={18} />
                    )}
                    {isLoading ? "Creating Owner..." : "Create Owner Account"}
                </Button>
            </form>
        </Card>
    )
}
