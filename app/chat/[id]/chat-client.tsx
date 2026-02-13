
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Send, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
    otherUserName
}: {
    chatId: string
    initialMessages: Message[]
    currentUserId: string
    otherUserName: string
}) {
    const supabase = createClient()
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [newMessage, setNewMessage] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel(`chat:${chatId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chatId}`
            }, (payload) => {
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

        // Optimistic Update (Optional, but good UX)
        // We rely on Realtime for the actual update to avoid duplication logic complexity here for now,
        // but showing it immediately is better.
        // Let's just wait for Realtime/Response for simplicity in V1.

        const { error } = await supabase
            .from('messages')
            .insert({
                chat_id: chatId,
                sender_id: currentUserId,
                content: text
            })

        if (error) {
            console.error("Failed to send:", error)
            // Restore text if failed?
            setNewMessage(text)
        } else {
            // Update Last Message in Chat Table
            await supabase
                .from('chats')
                .update({
                    last_message: text,
                    last_message_at: new Date().toISOString()
                })
                .eq('id', chatId)
        }
    }

    return (
        <div className="flex flex-col h-screen bg-[#1a1a1a] text-white font-sans">
            {/* HEADER */}
            <header className="flex items-center gap-4 p-4 bg-[#1a1a1a] border-b border-[#333] sticky top-0 z-10">
                <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-[#333] transition-colors text-gray-400 hover:text-white">
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
                    {otherUserName.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1">
                    <h2 className="font-bold text-lg leading-tight">{otherUserName}</h2>
                    <span className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                        Online
                    </span>
                </div>

                <button className="p-2 rounded-full hover:bg-[#333] text-gray-400">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </header>

            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#1a1a1a]">
                {messages.map(msg => {
                    const isMe = msg.sender_id === currentUserId
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-[#2a2a2a] text-gray-200 border border-[#333] rounded-tl-none'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="p-4 bg-[#1a1a1a] border-t border-[#333]">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-[#2a2a2a] pl-4 pr-2 py-2 rounded-full border border-[#333] focus-within:border-blue-500/50 transition-colors">
                    <input
                        type="text"
                        className="flex-1 bg-transparent focus:outline-none text-white placeholder-gray-500"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-700 transition-all"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    )
}
