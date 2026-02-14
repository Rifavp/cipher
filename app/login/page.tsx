
'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Lock, Hash } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [uniqueCode, setUniqueCode] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null)

    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            // 1. Resolve Email from Unique Code
            // Try direct query first (works if RLS allows public read which is default for profiles)
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('unique_code', uniqueCode.trim().toUpperCase())
                .single()

            if (profileError || !profile) {
                console.error("Profile lookup error:", profileError)
                throw new Error('Invalid Unique Code or Password') // Generic error for security
            }

            // 2. Sign In with Email & Password
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: password
            })

            if (authError) throw new Error('Invalid Unique Code or Password')

            // Success -> Redirect
            router.push('/')
            router.refresh()
        } catch (error: any) {
            setMessage({ text: error.message, type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#1a1a1a] flex items-center justify-center p-4 transition-colors">
            <div className="w-full max-w-sm bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#333] rounded-2xl p-8 shadow-xl">

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Login Page</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Enter your credentials to continue</p>
                </div>

                {message && (
                    <div className={`p-3 rounded-lg mb-6 text-sm text-center ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">

                    {/* Unique Code Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Unique Code</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                value={uniqueCode}
                                onChange={(e) => setUniqueCode(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400 font-mono tracking-wider uppercase"
                                placeholder="ABCD12"
                            />
                            <Hash className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
                                placeholder="••••••"
                            />
                            <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 text-sm mb-3">No account?</p>
                    <Link
                        href="/signup"
                        className="inline-block w-full py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-[#333] transition-colors text-sm"
                    >
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    )
}
