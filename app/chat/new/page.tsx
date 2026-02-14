
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NewChatPage(props: {
    searchParams: Promise<{ code?: string }>
}) {
    const searchParams = await props.searchParams
    const targetCode = searchParams.code

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    if (!targetCode) redirect('/')

    // 1. Find Target User
    const { data: targetUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('unique_code', targetCode)
        .single()

    // ERROR HANDLING: User Not Found
    if (!targetUser) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#1a1a1a] text-white p-4">
                <div className="bg-[#2a2a2a] p-8 rounded-2xl max-w-sm w-full text-center border border-[#333]">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">User Not Found</h1>
                    <p className="text-gray-400 mb-6">
                        No user found with the code <span className="text-white font-mono font-bold">{targetCode}</span>.
                    </p>
                    <Link href="/" className="inline-flex items-center gap-2 bg-[#333] hover:bg-[#444] text-white px-6 py-3 rounded-xl transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Go Back
                    </Link>
                </div>
            </div>
        )
    }

    // ERROR HANDLING: Self Chat
    if (targetUser.id === user.id) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#1a1a1a] text-white p-4">
                <div className="bg-[#2a2a2a] p-8 rounded-2xl max-w-sm w-full text-center border border-[#333]">
                    <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">Whoops!</h1>
                    <p className="text-gray-400 mb-6">
                        You cannot start a chat with yourself.
                    </p>
                    <Link href="/" className="inline-flex items-center gap-2 bg-[#333] hover:bg-[#444] text-white px-6 py-3 rounded-xl transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Go Back
                    </Link>
                </div>
            </div>
        )
    }

    // 2. Get or Create Chat via RPC
    const { data: chatId, error: rpcError } = await supabase.rpc('get_or_create_direct_chat', {
        other_user_id: targetUser.id
    })

    if (rpcError) {
        console.error("Error creating chat:", rpcError)
        return <div>Error creating chat. Please try again.</div>
    }

    redirect(`/chat/${chatId}`)
}
