
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, User, Moon, Sun, Copy, Check, ArrowRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useTheme } from './theme-provider'

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
        custom_chat_name?: string | null
    }[]
}

export default function HomeClient({ profile, initialChats }: { profile: Profile, initialChats: Chat[] }) {
    const router = useRouter()
    const { theme, toggleTheme } = useTheme()
    const [searchTerm, setSearchTerm] = useState('')
    const [chats, setChats] = useState(initialChats)
    const [copied, setCopied] = useState(false)

    // DEBUG: Log all chats data
    console.log("HomeClient - Chats Loaded:", chats)

    // Helper to format date (moved outside loop)
    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24))

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        } else if (diffDays === 1) {
            return 'Yesterday'
        } else {
            return date.toLocaleDateString()
        }
    }

    // Helper to get display info for a chat
    const getChatDisplayInfo = (chat: Chat) => {
        const otherParticipant = chat.participants.find(p => p.user_id !== profile.id)
        const myParticipant = chat.participants.find(p => p.user_id === profile.id)

        // DEBUG: Log specific participants for each chat
        console.log(`Chat ${chat.id} Participants:`, chat.participants)
        console.log(`Chat ${chat.id} - Other Participant Found?`, !!otherParticipant)

        // Use my custom name for this chat if set, otherwise fallback to other user's name/code
        // Priority: Custom Name -> Unique Code -> Display Name -> 'Unknown'
        const customName = myParticipant?.custom_chat_name
        const otherCode = otherParticipant?.unique_code
        const otherDisplayName = otherParticipant?.display_name

        // Detect if other participant is missing (likely RLS issue)
        const isMissingOtherUser = !otherParticipant && !myParticipant?.custom_chat_name

        const displayName = customName || otherCode || otherDisplayName || (isMissingOtherUser ? 'Unknown User' : 'Unknown')
        const uniqueCode = otherCode || (isMissingOtherUser ? 'DB ERROR' : 'UNK')

        return { displayName, uniqueCode }
    }

    // Filter chats based on search
    const filteredChats = chats.filter(chat => {
        const { displayName, uniqueCode } = getChatDisplayInfo(chat)
        const search = searchTerm.toLowerCase()

        return displayName.toLowerCase().includes(search) ||
            uniqueCode.toLowerCase().includes(search) ||
            (chat.last_message && chat.last_message.toLowerCase().includes(search))
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

    // Realtime Subscriptions
    useEffect(() => {
        const supabase = createClient()

        // 1. Listen for new chats (where I am added as a participant)
        const participantChannel = supabase
            .channel('home_participants')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_participants',
                filter: `user_id=eq.${profile.id}`
            }, async (payload) => {
                console.log("New chat detected:", payload)
                // Fetch the full chat details to add to list
                const { data: newChatData, error } = await supabase
                    .from('chats')
                    .select(`
                        *,
                        participants:chat_participants(
                            user_id,
                            custom_chat_name,
                            profiles(display_name, unique_code)
                        )
                    `)
                    .eq('id', payload.new.chat_id)
                    .single()

                if (newChatData && !error) {
                    // Normalize the data structure to match our state
                    const formattedChat: Chat = {
                        id: newChatData.id,
                        last_message: newChatData.last_message,
                        last_message_at: newChatData.last_message_at,
                        participants: newChatData.participants.map((p: any) => ({
                            user_id: p.user_id,
                            display_name: p.profiles?.display_name,
                            unique_code: p.profiles?.unique_code,
                            custom_chat_name: p.custom_chat_name
                        }))
                    }
                    setChats(prev => [formattedChat, ...prev])
                }
            })
            // Listen for UPDATES to chat_participants (e.g. renaming)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_participants',
                filter: `user_id=eq.${profile.id}`
            }, (payload) => {
                // Update local state for renamed chat
                setChats(prev => prev.map(c => {
                    if (c.id === payload.new.chat_id) {
                        return {
                            ...c,
                            participants: c.participants.map(p => {
                                if (p.user_id === profile.id) {
                                    return { ...p, custom_chat_name: payload.new.custom_chat_name }
                                }
                                return p
                            })
                        }
                    }
                    return c
                }))
            })
            .subscribe()

        // 2. Listen for updates to existing chats (last_message)
        const chatsChannel = supabase
            .channel('home_chats')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'chats'
            }, (payload) => {
                setChats(prev => prev.map(chat => {
                    if (chat.id === payload.new.id) {
                        return {
                            ...chat,
                            last_message: payload.new.last_message,
                            last_message_at: payload.new.last_message_at
                        }
                    }
                    return chat
                }).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()))
            })
            .subscribe()

        return () => {
            supabase.removeChannel(participantChannel)
            supabase.removeChannel(chatsChannel)
        }
    }, [profile.id])

    return (
        <div className="min-h-screen flex flex-col transition-colors bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white font-sans">
            {/* HEADER */}
            <header className="w-full max-w-md mx-auto p-4 flex justify-between items-center sticky top-0 z-10 border-b transition-colors bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800">
                <h1 className="text-xl font-bold tracking-wide">Home Page</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 rounded-full bg-transparent border flex items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                    >
                        {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-orange-500" />}
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
                        className="w-full bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                    />
                    <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-3.5" />
                </div>
            </div>

            {/* MAIN CONTENT */}
            <main className="w-full max-w-md mx-auto px-4 flex-1 pb-20">

                {/* START NEW CHAT OPTION */}
                {searchTerm && (
                    <div
                        onClick={handleStartChat}
                        className="mb-4 bg-blue-600/10 border border-blue-600/30 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-blue-600/20 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-blue-500 font-semibold group-hover:text-blue-400">Start new chat</h3>
                                <p className="text-gray-400 text-xs">Unique Code: <span className="font-mono text-gray-300">{searchTerm.toUpperCase()}</span></p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                )}

                {/* FIRST TIME USER / NO CHATS & NO SEARCH */}
                {!searchTerm && chats.length === 0 && (
                    <div className="flex flex-col items-center text-center mt-8 animate-in fade-in zoom-in duration-500">
                        <div className="bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#333] rounded-2xl p-8 w-full shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500 opacity-10 rounded-full blur-2xl"></div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Welcome to Cipher!</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                                Start a secure chat by searching for a friend's Unique Code above.
                            </p>

                            <div className="p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-dashed border-gray-300 dark:border-[#444]">
                                <p className="text-xs text-gray-500">
                                    Need your own code? <Link href="/profile" className="text-blue-500 dark:text-blue-400 hover:underline">Check your Profile</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* CHAT LIST */}
                <div className="space-y-3">
                    {filteredChats.map(chat => {
                        const { displayName, uniqueCode } = getChatDisplayInfo(chat)
                        const initial = displayName.charAt(0).toUpperCase()

                        // ... in return
                        const time = formatRelativeTime(chat.last_message_at)

                        return (
                            <div
                                onClick={() => router.push(`/chat/${chat.id}`)}
                                key={chat.id}
                                className="flex items-center gap-4 p-4 border border-gray-200 dark:border-[#333] bg-white dark:bg-[#2a2a2a] rounded-xl cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-[#333] hover:border-blue-500/50 group"
                            >
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
                                        {initial}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-gray-900 dark:text-white font-semibold truncate group-hover:text-blue-500 transition-colors">{displayName}</h3>
                                        <span className="text-xs text-gray-500">{time}</span>
                                    </div>

                                    {/* Message */}
                                    <p className="text-gray-500 dark:text-gray-400 text-sm truncate pr-2 mb-1">
                                        {chat.last_message || 'No messages'}
                                    </p>

                                    {/* Unique Code (Under Message) */}
                                    <div className="flex items-center">
                                        <span className="text-[10px] bg-gray-100 dark:bg-[#333] text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#444] font-mono tracking-wide">
                                            {uniqueCode}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

            </main>
        </div>
    )
}
