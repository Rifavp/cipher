
'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, AlertTriangle } from 'lucide-react'

export default function SetupPasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null)

    const supabase = createClient()

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        if (password.length < 6) {
            setMessage({ text: 'Password must be at least 6 characters.', type: 'error' })
            setLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setMessage({ text: 'Passwords do not match.', type: 'error' })
            setLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            setMessage({ text: 'Password set successfully!', type: 'success' })

            // Redirect to home after short delay
            setTimeout(() => {
                router.push('/')
                router.refresh()
            }, 1500)

        } catch (error: any) {
            setMessage({ text: error.message, type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#2a2a2a] border border-[#333] rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Set Your Password</h1>
                    <p className="text-gray-400 text-sm">Use a strong password to secure your account.</p>
                </div>

                {/* Warning Box */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-red-300">
                        <p className="font-bold mb-1">Important:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>This password is permanent and cannot be reset easily (no "Forgot Password" option).</li>
                            <li>One email = One Unique Code. You cannot change your code later.</li>
                        </ul>
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSetPassword} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password (Min 6 chars)</label>
                        <div className="relative">
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="••••••"
                            />
                            <Lock className="w-5 h-5 text-gray-500 absolute left-3 top-3.5" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="••••••"
                            />
                            <Lock className="w-5 h-5 text-gray-500 absolute left-3 top-3.5" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set Password & Continue'}
                    </button>
                </form>
            </div>
        </div>
    )
}
