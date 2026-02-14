
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import HomeClient from './home-client'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  // 1. Check Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Fallback: This usually happens if the database trigger failed or didn't run.
    // We can try to recover or just ask them to re-login to trigger creation logic if we had it there.
    // For now, simple error.
    return (
      <div className="flex h-screen items-center justify-center bg-[#1a1a1a] text-white">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-gray-400 mb-4">Your account exists but your profile data is missing.</p>
          <form action={async () => {
            'use server'
            const sb = await createClient()
            await sb.auth.signOut()
            redirect('/login')
          }}>
            <button className="bg-blue-600 px-4 py-2 rounded-lg">Log Out</button>
          </form>
        </div>
      </div>
    )
  }

  // 3. Fetch Chats
  // We need to fetch chats where user is a participant.
  // This is a bit complex in Supabase without a stored procedure or view,
  // but we can use nested selects.

  // Actually, standard way:
  // Get chat_ids from chat_participants
  const { data: participations } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', user.id)

  const chatIds = participations?.map(p => p.chat_id) || []

  let chats: any[] = []

  if (chatIds.length > 0) {
    const { data: chatsData } = await supabase
      .from('chats')
      .select(`
            *,
            chat_participants (
                user_id,
                joined_at,
                profiles (
                   unique_code,
                   display_name
                )
            )
        `)
      .in('id', chatIds)
      .order('last_message_at', { ascending: false })

    chats = chatsData || []
  }

  // Transform data for Client
  const formattedChats = chats.map(c => ({
    id: c.id,
    last_message: c.last_message,
    last_message_at: c.last_message_at,
    participants: c.chat_participants.map((p: any) => ({
      user_id: p.user_id,
      unique_code: p.profiles?.unique_code || 'UNK',
      display_name: p.profiles?.display_name || 'Unknown',
      custom_chat_name: p.custom_chat_name
    }))
  }))

  return <HomeClient profile={profile} initialChats={formattedChats} />
}
