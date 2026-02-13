
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NewChatPage({ searchParams }: { searchParams: { code: string } }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const targetCode = searchParams.code

    if (!targetCode) redirect('/')

    // 1. Find Target User
    const { data: targetUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('unique_code', targetCode)
        .single()

    if (!targetUser) {
        // Handle "User not found" - For now just redirect home (ideally show error)
        redirect('/')
    }

    if (targetUser.id === user.id) {
        redirect('/') // Cannot chat with self
    }

    // 2. Check if Chat Exists
    // logic: find chat where participants include both user.id and targetUser.id
    // This is hard in basic Supabase query.
    // We'll simplisticly fetch ALL my chats and filter in code (inefficient for millions, fine for MVP)
    // OR use a stored procedure.
    // Let's use the efficient approach:

    // Get all chat_ids I am in
    const { data: myChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id)

    const myChatIds = myChats?.map(c => c.chat_id) || []

    // Check if target is in any of these chats
    if (myChatIds.length > 0) {
        const { data: existingChat } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .in('chat_id', myChatIds)
            .eq('user_id', targetUser.id)
            .single() // Should be only one 1-on-1 chat if we enforce logic, but here just find *any*

        if (existingChat) {
            redirect(`/chat/${existingChat.chat_id}`)
        }
    }

    // 3. Create New Chat
    const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single()

    if (chatError || !newChat) redirect('/')

    // 4. Add Participants
    await supabase
        .from('chat_participants')
        .insert([
            { chat_id: newChat.id, user_id: user.id },
            { chat_id: newChat.id, user_id: targetUser.id }
        ])

    redirect(`/chat/${newChat.id}`)
}
