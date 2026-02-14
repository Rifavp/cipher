
'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, AlertTriangle, ArrowRight, KeyRound } from 'lucide-react'

// Define steps
type SignupStep = 'EMAIL' | 'OTP' | 'PASSWORD'

export default function SignupPage() {
    const router = useRouter()
    const [step, setStep] = useState<SignupStep>('EMAIL')
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null)

    const supabase = createClient()

    // Step 1: Request OTP
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: true, // Allow signup
                    // emailRedirectTo: `${window.location.origin}/auth/callback` // Not used for code flow directly but good practice
                }
            })

            if (error) throw error

            setMessage({ text: 'Unique code sent to your email!', type: 'success' })
            setStep('OTP')
        } catch (error: any) {
            setMessage({ text: error.message, type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email'
            })

            if (error) throw error

            if (data.session) {
                // User is logged in (passwordless)
                // Proceed to set password
                setMessage({ text: 'Email verified! Please set a password.', type: 'success' })
                setStep('PASSWORD')
            }
        } catch (error: any) {
            setMessage({ text: error.message, type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    // Step 3: Set Password
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        if (password !== confirmPassword) {
            setMessage({ text: "Passwords do not match", type: 'error' })
            setLoading(false)
            return
        }

        try {
            const { data, error } = await supabase.auth.updateUser({
                password: password,
                data: {
                    display_name: email.split('@')[0]
                }
            })

            if (error) throw error

            // Success -> Redirect to Home
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
            <div className="w-full max-w-sm bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#333] rounded-2xl p-8 shadow-xl relative overflow-hidden">

                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {step === 'EMAIL' && "Create Account"}
                        {step === 'OTP' && "Verify Email"}
                        {step === 'PASSWORD' && "Set Password"}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {step === 'EMAIL' && "Join Cipher to chat securely"}
                        {step === 'OTP' && `Check ${email} for the code`}
                        {step === 'PASSWORD' && "Secure your account"}
                    </p>
                </div>

                {message && (
                    <div className={`p-3 rounded-lg mb-6 text-sm text-center ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                {/* WARNING (Only show on Password step) */}
                {step === 'PASSWORD' && (
                    <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3 items-start animate-in fade-in zoom-in duration-300">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                            Please remember your password. There is no password recovery or change option.
                        </p>
                    </div>
                )}

                {/* STEP 1: EMAIL */}
                {step === 'EMAIL' && (
                    <form onSubmit={handleRequestOtp} className="space-y-4 animate-in slide-in-from-right duration-300">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
                                    placeholder="you@example.com"
                                    autoFocus
                                />
                                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Code <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>
                )}

                {/* STEP 2: OTP */}
                {step === 'OTP' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in slide-in-from-right duration-300">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Verification Code</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400 tracking-widest font-mono text-center text-lg"
                                    placeholder="123456"
                                    autoFocus
                                    maxLength={6}
                                />
                                <KeyRound className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <button type="button" onClick={() => setStep('EMAIL')} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Change Email</button>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
                        </button>
                    </form>
                )}

                {/* STEP 3: PASSWORD */}
                {step === 'PASSWORD' && (
                    <form onSubmit={handleSetPassword} className="space-y-4 animate-in slide-in-from-right duration-300">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Create Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
                                    placeholder="Min. 6 characters"
                                    autoFocus
                                />
                                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
                                    placeholder="Re-enter password"
                                />
                                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-green-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Signup'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-sm">
                    <span className="text-gray-500">Already have an account? </span>
                    <Link href="/login" className="text-blue-600 hover:text-blue-500 font-semibold transition-colors">
                        Log In
                    </Link>
                </div>
            </div>
        </div>
    )
}
