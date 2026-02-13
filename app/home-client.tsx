
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, User, Moon, Sun, Copy, Check } from 'lucide-react'

type Profile = {
    id: string
    unique_code: string
    display_name: string | null
}

type Chat = {
    id: string
    last_message: string | null
    last_message_at: string
    participants: {
        user_id: string
        display_name: string | null
        unique_code: string
    }[]
}

export default function HomeClient({ profile, initialChats }: { profile: Profile, initialChats: Chat[] }) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [chats, setChats] = useState(initialChats)
    const [copied, setCopied] = useState(false)

    // Filter chats based on search
    const filteredChats = chats.filter(chat => {
        const participant = chat.participants.find(p => p.user_id !== profile.id)
        const name = participant?.display_name || participant?.unique_code || 'Unknown'
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (chat.last_message && chat.last_message.toLowerCase().includes(searchTerm.toLowerCase()))
    })

    const copyCode = () => {
        navigator.clipboard.writeText(profile.unique_code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleStartChat = () => {
        // In a real app we might validate the code format first
        if (!searchTerm) return
        // Use the search term as the unique code to find
        router.push(`/chat/new?code=${searchTerm.toUpperCase()}`)
    }

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-white font-sans flex flex-col">
            {/* HEADER */}
            <header className="w-full max-w-md mx-auto p-4 flex justify-between items-center sticky top-0 bg-[#1a1a1a] z-10 border-b border-gray-800">
                <h1 className="text-xl font-bold tracking-wide">Home Page</h1>
                <div className="flex items-center gap-2">
                    <button className="w-10 h-10 rounded-full bg-transparent border border-gray-700 flex items-center justify-center hover:bg-gray-800 transition-colors">
                        <Moon className="w-5 h-5" />
                    </button>
                    <Link href="/profile" className="flex flex-col items-center group cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:bg-blue-500 transition-all">
                            <User className="w-6 h-6" />
                        </div>
                    </Link>
                </div>
            </header>

            {/* SEARCH */}
            <div className="w-full max-w-md mx-auto px-4 mt-2 mb-6">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by name or unique code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleStartChat()}
                        className="w-full bg-[#2a2a2a] border border-[#333] text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-500 shadow-sm"
                    />
                    <Search className="w-5 h-5 text-gray-500 absolute left-3 top-3.5" />
                </div>
            </div>

            {/* MAIN CONTENT */}
            <main className="w-full max-w-md mx-auto px-4 flex-1 pb-20">

                {/* FIRST TIME USER / NO CHATS */}
                {chats.length === 0 && !searchTerm && (
                    <div className="flex flex-col items-center text-center mt-8 animate-in fade-in zoom-in duration-500">
                        <div className="bg-[#2a2a2a] border border-[#333] rounded-2xl p-8 w-full shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500 opacity-10 rounded-full blur-2xl"></div>
                            <h2 className="text-xl font-semibold text-gray-200 mb-2">Welcome to Cipher!</h2>
                            <p className="text-gray-400 text-sm mb-6">Share your unique code with friends to start chatting securely.</p>

                            <div className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-2">Your Unique Code</div>

                            <div onClick={copyCode} className="bg-[#1a1a1a] border-2 border-dashed border-blue-500/30 rounded-xl p-6 mb-6 relative group cursor-pointer hover:border-blue-500 transition-colors">
                                <span className="text-4xl font-mono font-bold text-white tracking-wider drop-shadow-lg">
                                    {profile.unique_code}
                                </span>
                                <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copied' : 'Click to copy'}
                                </div>
                            </div>

                            <p className="text-gray-500 text-xs">Need to connect? Search your friend's code above.</p>
                        </div>
                    </div>
                )}

                {/* CHAT LIST */}
                <div className="space-y-3">
                    {filteredChats.map(chat => {
                        const participant = chat.participants.find(p => p.user_id !== profile.id)
                        const name = participant?.display_name || participant?.unique_code || 'Unknown'
                        const initial = name.charAt(0).toUpperCase()
                        const time = new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                        return (
                            <Link href={`/chat/${chat.id}`} key={chat.id} className="flex items-center gap-4 p-4 border border-[#333] bg-[#2a2a2a] rounded-xl cursor-pointer transition-all hover:bg-[#333] hover:border-blue-500/50 group">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
                                        {initial}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-white font-semibold truncate group-hover:text-blue-500 transition-colors">{name}</h3>
                                        <span className="text-xs text-gray-500">{time}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm truncate">{chat.last_message || 'No messages'}</p>
                                </div>
                            </Link>
                        )
                    })}
                </div>

            </main>
        </div>
    )
}
