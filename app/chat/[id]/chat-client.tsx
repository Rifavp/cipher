
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Send, MoreVertical, X, Check, Edit2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from '../../theme-provider'

type Message = {
    id: string
    content: string
    sender_id: string
    created_at: string
}

export default function ChatClient({
    chatId,
    initialMessages,
    currentUserId,
    initialChatName,
    otherUserName,
    otherUniqueCode
}: {
    chatId: string
    initialMessages: Message[]
    currentUserId: string
    initialChatName: string
    otherUserName: string // Original display name
    otherUniqueCode: string
}) {
    const supabase = createClient()
    const { theme } = useTheme()
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [newMessage, setNewMessage] = useState('')
    const [chatName, setChatName] = useState(initialChatName)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isRenaming, setIsRenaming] = useState(false)
    const [tempName, setTempName] = useState(initialChatName)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close menu on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Realtime Subscription
    useEffect(() => {
        console.log("Setting up subscription for chat:", chatId)
        const channel = supabase
            .channel(`chat:${chatId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chatId}`
            }, (payload) => {
                console.log("Received new message:", payload)
                setMessages(prev => [...prev, payload.new as Message])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [chatId, supabase])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        const text = newMessage
        setNewMessage('') // Optimistic clear

        const { error } = await supabase
            .from('messages')
            .insert({
                chat_id: chatId,
                sender_id: currentUserId,
                content: text
            })

        if (error) {
            console.error("Failed to send:", error)
            setNewMessage(text)
        } else {
            // Update last_message
            await supabase
                .from('chats')
                .update({
                    last_message: text,
                    last_message_at: new Date().toISOString()
                })
                .eq('id', chatId)
        }
    }

    const handleRenameChat = async () => {
        const newName = tempName.trim()
        if (!newName) return

        // Optimistic update
        const oldName = chatName
        setChatName(newName)
        setIsRenaming(false)
        setIsMenuOpen(false)

        try {
            // Update custom_chat_name for *this user* only
            const { error } = await supabase
                .from('chat_participants')
                .update({ custom_chat_name: newName })
                .eq('chat_id', chatId)
                .eq('user_id', currentUserId)

            if (error) throw error
        } catch (error) {
            console.error("Failed to rename chat:", error)
            setChatName(oldName) // Revert
        }
    }

    // Auto-resize logic and KeyDown
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewMessage(e.target.value)
        e.target.style.height = 'auto'
        e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage(e as any)
        }
    }

    const isDark = theme === 'dark'

    return (
        <div className={`flex flex-col h-screen font-sans ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>

            {/* HEADER */}
            <header className={`flex items-center justify-between px-6 py-4 border-b relative z-20 ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Link href="/" className={`transition-colors shrink-0 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="min-w-0">
                        {isRenaming ? (
                            <div className="flex items-center gap-2 animate-in fadeIn duration-200">
                                <input
                                    autoFocus
                                    type="text"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className={`text-sm px-2 py-1 rounded border min-w-[200px] w-full ${isDark ? 'bg-[#2a2a2a] border-[#444] text-white' : 'bg-gray-100 border-gray-300 text-black'}`}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameChat()
                                        if (e.key === 'Escape') setIsRenaming(false)
                                    }}
                                />
                                <button onClick={handleRenameChat} className="p-1 hover:bg-green-500/20 rounded-full text-green-500">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setIsRenaming(false)} className="p-1 hover:bg-red-500/20 rounded-full text-red-500">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div>
                                <h2 className={`text-lg font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{chatName}</h2>
                                <div className="text-xs text-[#888] font-mono tracking-wide">{otherUniqueCode}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* MENU BUTTON */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-[#333] text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* DROPDOWN MENU */}
                    {isMenuOpen && (
                        <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl border py-1 animate-in zoom-in-95 duration-100 origin-top-right ${isDark ? 'bg-[#2a2a2a] border-[#444]' : 'bg-white border-gray-200'}`}>
                            <button
                                onClick={() => {
                                    setTempName(chatName)
                                    setIsRenaming(true)
                                    setIsMenuOpen(false)
                                }}
                                className={`w-full px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${isDark ? 'text-gray-200 hover:bg-[#333]' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                <Edit2 className="w-4 h-4" />
                                Rename Chat
                            </button>
                            {/* Add more options here later */}
                        </div>
                    )}
                </div>
            </header>

            {/* MESSAGES AREA */}
            <div className={`flex-1 overflow-y-auto p-6 flex flex-col gap-3 ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                {messages.map((msg, index) => {
                    const isMe = msg.sender_id === currentUserId

                    // Format time
                    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                    return (
                        <div key={msg.id} className={`flex gap-3 animate-in slide-in-from-bottom-2 duration-300 ${isMe ? 'justify-end' : ''}`}>

                            {/* Avatar (Left for others) */}
                            {!isMe && (
                                <div className="w-8 h-8 rounded-full bg-[#4a9eff] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                    {otherUserName.charAt(0).toUpperCase()}
                                </div>
                            )}

                            <div className={`flex flex-col gap-1 max-w-[60%] ${isMe ? 'items-end' : ''}`}>

                                {/* Name (Left only) -> Using original name for clarity in chat bubbles if needed, or consistent with header? Usually names in bubbles are static/original. Let's keep original for now or hide if 1:1. Keeping hidden as per previous design. */}
                                {!isMe && <div className="text-xs text-[#888] px-3 hidden">{otherUserName}</div>}

                                {/* Bubble */}
                                <div className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed break-words ${isMe
                                    ? 'bg-[#4a9eff] text-white'
                                    : isDark ? 'bg-[#333] text-white' : 'bg-white border border-gray-200 text-gray-800'
                                    }`}>
                                    {msg.content}
                                </div>

                                {/* Time */}
                                <div className={`text-[11px] text-[#666] px-3 ${isMe ? 'text-right' : ''}`}>
                                    {time}
                                </div>
                            </div>

                            {/* Avatar (Right for me) */}
                            {isMe && (
                                <div className="w-8 h-8 rounded-full bg-[#4a9eff] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 order-2">
                                    You
                                </div>
                            )}
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className={`p-5 md:px-6 border-t flex gap-3 items-end ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'}`}>
                <textarea
                    className={`flex-1 rounded-lg px-4 py-3 text-sm resize-none max-h-[100px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#4a9eff] ${isDark
                        ? 'bg-[#333] border border-[#444] text-white placeholder-[#888] focus:bg-[#3a3a3a]'
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
                        }`}
                    placeholder="Type a message..."
                    rows={1}
                    value={newMessage}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                />
                <button
                    onClick={(e) => handleSendMessage(e as any)}
                    className="w-10 h-10 bg-[#4a9eff] hover:bg-[#3a8ee0] active:scale-95 text-white rounded-md flex items-center justify-center transition-all font-bold shadow-lg"
                >
                    <span className="text-lg pb-1">→</span>
                </button>
            </div>
        </div>
    )
}
