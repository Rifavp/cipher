
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatClient from './chat-client'

export const dynamic = 'force-dynamic'

export default async function ChatPage({ params }: { params: { id: string } }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const chatId = params.id

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

    if (error || !chat) {
        redirect('/') // Chat doesn't exist or no access
    }

    // 2. Fetch Initial Messages
    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

    // 3. Identify "Other User" for Header
    const otherParticipant = chat.chat_participants.find((p: any) => p.user_id !== user.id)
    const otherName = otherParticipant?.profiles?.display_name || otherParticipant?.profiles?.unique_code || 'Unknown'

    return (
        <ChatClient
            chatId={chatId}
            initialMessages={messages || []}
            currentUserId={user.id}
            otherUserName={otherName}
        />
    )
}
