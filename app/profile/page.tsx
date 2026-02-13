
'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, LogOut, User } from 'lucide-react'

export default function ProfilePage() {
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-white font-sans p-4">
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    Back to Home
                </Link>
            </header>

            <div className="max-w-md mx-auto bg-[#2a2a2a] border border-[#333] rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white mb-4 shadow-lg">
                        <User className="w-12 h-12" />
                    </div>
                    <h1 className="text-2xl font-bold">Your Profile</h1>
                    <p className="text-gray-400">Manage your account</p>
                </div>

                <div className="space-y-4">
                    {/* Add more profile fields here if needed */}

                    <button
                        onClick={handleLogout}
                        className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-600/20 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-5 h-5" />
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    )
}
