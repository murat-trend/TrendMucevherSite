'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export type Mesaj = {
  id: string
  message: string
  created_at: string
  is_read: boolean
  product_id: string | null
  sender_id: string | null
  sender_name: string | null
}

interface Props {
  messages: Mesaj[]
  onClose: () => void
}

export function MesajlarModal({ messages, onClose }: Props) {
  const [replyText, setReplyText]     = useState<Record<string, string>>({})
  const [replySending, setReplySending] = useState<Record<string, boolean>>({})

  const handleReply = async (msg: Mesaj) => {
    const text = replyText[msg.id]?.trim()
    if (!text) return

    setReplySending((prev) => ({ ...prev, [msg.id]: true }))

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('messages').insert({
        sender_id:   user.id,
        receiver_id: msg.sender_id,
        product_id:  msg.product_id,
        message:     text,
      })
      setReplyText((prev) => ({ ...prev, [msg.id]: '' }))
    }

    setReplySending((prev) => ({ ...prev, [msg.id]: false }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border/40 bg-[#0f1117] p-6">

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Mesajlar</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Henüz mesaj yok
          </p>
        ) : (
          <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-lg border border-border/40 bg-white/[0.03] p-3"
              >
                <p className="mb-1 text-[10px] font-semibold text-amber-300">
                  {msg.sender_name ?? 'Anonim'}
                </p>
                <p className="text-sm text-foreground">{msg.message}</p>
                <p className="mt-1 text-[10px] text-muted">
                  {new Date(msg.created_at).toLocaleString('tr-TR')}
                </p>

                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={replyText[msg.id] ?? ''}
                    onChange={(e) =>
                      setReplyText((prev) => ({ ...prev, [msg.id]: e.target.value }))
                    }
                    placeholder="Yanıtla..."
                    className="flex-1 rounded-lg border border-border/40 bg-white/[0.04] px-2 py-1.5 text-xs text-foreground outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleReply(msg)}
                    disabled={replySending[msg.id] || !replyText[msg.id]?.trim()}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                  >
                    {replySending[msg.id] ? '...' : 'Gönder'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
