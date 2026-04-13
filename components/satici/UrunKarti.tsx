'use client'

export type UrunKartiProduct = {
  id: string
  name: string
  thumbnail_url: string | null
  is_published: boolean
  personal_price: number
  jewelry_type: string
}

interface Props {
  product: UrunKartiProduct
  deletingId: string | null
  deleteError: string | null
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function UrunKarti({
  product: p,
  deletingId,
  deleteError,
  onEdit,
  onDelete,
}: Props) {
  const isDeleting = deletingId === p.id

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      {p.thumbnail_url && (
        <img
          src={p.thumbnail_url}
          alt={p.name}
          className="mb-3 h-40 w-full rounded-lg object-cover"
        />
      )}

      <p className="font-medium text-foreground">{p.name}</p>
      <p className="text-xs text-muted">
        {p.jewelry_type} · ₺{p.personal_price}
      </p>

      <span
        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          p.is_published
            ? 'bg-emerald-500/15 text-emerald-300'
            : 'bg-amber-500/15 text-amber-300'
        }`}
      >
        {p.is_published ? 'Yayında' : 'Onay Bekliyor'}
      </span>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(p.id)}
          className="inline-flex items-center gap-1 rounded-md border border-amber-400/60 bg-amber-400 px-2 py-1 text-[11px] font-medium text-neutral-900 hover:bg-amber-300 transition-colors"
        >
          Düzenle
        </button>

        <button
          type="button"
          onClick={() => onDelete(p.id)}
          disabled={isDeleting}
          className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Siliniyor...' : 'Sil'}
        </button>
      </div>

      {deleteError && deletingId === null && (
        <p className="mt-2 text-[11px] text-red-400">{deleteError}</p>
      )}
    </div>
  )
}
