"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, X } from "lucide-react"

interface AuthModalProps {
  onAuthenticate: (password: string) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}

export function AuthModal({ onAuthenticate, onClose }: AuthModalProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError("Password required")
      return
    }

    setIsSubmitting(true)
    const result = await onAuthenticate(password)
    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error || "Authentication failed")
      return
    }

    setPassword("")
    setError("")
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="glass-card w-full max-w-md p-6 border-2 border-primary/50 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold font-mono text-foreground">AUTHENTICATION_REQUIRED</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-mono text-muted-foreground mb-2">
              {">"} ENTER_PASSWORD:
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              className="font-mono bg-background border-primary/50 focus:border-primary"
              placeholder="••••••••"
              autoFocus
              disabled={isSubmitting}
            />
            {error && <p className="text-xs text-red-500 mt-2 font-mono">ERROR: {error}</p>}
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1 font-mono cursor-pointer" disabled={isSubmitting}>
              {isSubmitting ? "VALIDATING" : "AUTHENTICATE"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="font-mono cursor-pointer bg-transparent"
              disabled={isSubmitting}
            >
              CANCEL
            </Button>
          </div>
        </form>

        <div className="mt-6 p-3 bg-primary/10 border border-primary/30 text-xs font-mono text-muted-foreground">
          <p className="text-primary mb-1">{">"} SECURITY_NOTICE:</p>
          <p>Only authorized personnel can access editor mode.</p>
        </div>
      </Card>
    </div>
  )
}
