'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, LogOut, User, Moon, Sun, Info, X } from 'lucide-react'
import { useTheme } from '../theme-provider'

export default function ProfilePage() {
    const router = useRouter()
    const supabase = createClient()
    const { theme, toggleTheme } = useTheme()
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [uniqueCode, setUniqueCode] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        // Get User Email and Unique Code
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserEmail(user.email || null)

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('unique_code')
                    .eq('id', user.id)
                    .single()

                if (profile) setUniqueCode(profile.unique_code)
            }
        }
        fetchData()
    }, [supabase])

    const copyCode = () => {
        if (uniqueCode) {
            navigator.clipboard.writeText(uniqueCode)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
    }

    return (
        <div className={`min-h-screen font-sans p-4 transition-colors ${theme === 'dark' ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-900'}`}>

            {/* HEADER */}
            <header className="mb-8 flex justify-between items-center">
                <Link href="/" className={`inline-flex items-center gap-2 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
                    <ArrowLeft className="w-5 h-5" />
                    Back to Home
                </Link>
                <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-full border transition-all ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-white bg-white'}`}
                >
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-orange-500" />}
                </button>
            </header>

            <div className={`max-w-md mx-auto border rounded-2xl p-8 shadow-2xl ${theme === 'dark' ? 'bg-[#2a2a2a] border-[#333]' : 'bg-white border-gray-200'}`}>

                {/* PROFILE INFO */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white mb-4 shadow-lg text-3xl font-bold">
                        {userEmail ? userEmail[0].toUpperCase() : <User className="w-12 h-12" />}
                    </div>

                    {/* Unique Code Display */}
                    <div className="flex flex-col items-center gap-2 mb-2">
                        <span className={`text-xs uppercase tracking-widest font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Your Unique Code</span>
                        <button
                            onClick={copyCode}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl font-bold transition-all border ${theme === 'dark'
                                ? 'bg-[#1a1a1a] border-blue-500/30 text-blue-400 hover:border-blue-500'
                                : 'bg-gray-50 border-blue-200 text-blue-600 hover:border-blue-500'
                                }`}
                        >
                            {uniqueCode || 'Loading...'}
                            {copied ? <span className="text-xs ml-2 text-green-500">Copied!</span> : null}
                        </button>
                    </div>

                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{userEmail}</p>
                </div>

                <div className="space-y-4">

                    {/* ABOUT SECTION */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4 text-blue-500" />
                            <h3 className="font-bold text-sm uppercase tracking-wider">About App</h3>
                        </div>
                        <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Cipher is a secure, realtime chat application designed for privacy.
                            <br /><br />
                            <span className="font-semibold">Creators:</span> Rifa and Dilna.
                        </p>
                    </div>

                    {/* LOGOUT BUTTON */}
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-600/20 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-5 h-5" />
                        Log Out
                    </button>
                </div>
            </div>

            {/* LOGOUT MODAL */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-[#2a2a2a] border border-[#333] text-white' : 'bg-white text-gray-900'}`}>
                        <h3 className="text-lg font-bold mb-2">Confirm Logout</h3>
                        <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Are you sure you want to log out? You will need to sign in again to access your chats.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${theme === 'dark' ? 'bg-[#333] hover:bg-[#444] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-2.5 rounded-xl font-medium bg-red-600 hover:bg-red-700 text-white transition-colors shadow-lg shadow-red-500/20"
                            >
                                Yes, Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
