
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatClient from './chat-client'

export const dynamic = 'force-dynamic'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { id: chatId } = await params

    // 1. Fetch Chat Metadata & Participants
    const { data: chat, error } = await supabase
        .from('chats')
        .select(`
        *,
        chat_participants (
            user_id,
            profiles (
                display_name,
                unique_code
            )
        )
    `)
        .eq('id', chatId)
        .single()

    // ERROR HANDLING: Show error instead of redirecting
    if (error || !chat) {
        console.error("Chat page error:", error)
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4">
                <h1 className="text-xl font-bold text-red-500 mb-2">Error Loading Chat</h1>
                <p className="text-gray-400 mb-4">{error?.message || 'Chat not found or access denied.'}</p>
                <code className="bg-gray-800 p-2 rounded mb-6 text-xs">{JSON.stringify(error, null, 2)}</code>
                <a href="/" className="bg-blue-600 px-4 py-2 rounded">Go Home</a>
            </div>
        )
    }

    // 2. Fetch Initial Messages
    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

    // 3. Identify "Other User" for Header
    const otherParticipant = chat.chat_participants.find((p: any) => p.user_id !== user.id)
    const currentUserParticipant = chat.chat_participants.find((p: any) => p.user_id === user.id)

    // Fallback order: Unique Code -> Display Name -> 'Unknown'
    const otherName = otherParticipant?.profiles?.unique_code || otherParticipant?.profiles?.display_name || 'Unknown'
    const otherUniqueCode = otherParticipant?.profiles?.unique_code || ''

    // Name Logic: Use custom name if set, else use other user's name
    const initialChatName = currentUserParticipant?.custom_chat_name || otherName
    // const initialChatName = otherName // FALLBACK UNTIL DB MIGRATION

    return (
        <ChatClient
            chatId={chatId}
            initialMessages={messages || []}
            currentUserId={user.id}
            initialChatName={initialChatName}
            otherUserName={otherName} // Original name for fallback/reference
            otherUniqueCode={otherUniqueCode}
        />
    )
}
