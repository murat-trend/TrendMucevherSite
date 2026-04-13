'use client'

interface Props {
  storeName: string | null
  profileLoading: boolean
  hasSession: boolean
  unreadMessages: number
  savingStoreName: boolean
  profileSaveError: string | null
  onSaveStoreName: () => void
  onOpenMessages: () => void
}

export function MagazaAdiBanner({
  storeName,
  profileLoading,
  hasSession,
  unreadMessages,
  savingStoreName,
  profileSaveError,
  onSaveStoreName,
  onOpenMessages,
}: Props) {
  if (profileLoading) return null

  if (hasSession && (storeName === null || storeName === '')) {
    return (
      <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-amber-300">
          <span>Mağaza adınızı henüz belirlemediniz</span>
          {unreadMessages > 0 && (
            <button
              type="button"
              onClick={onOpenMessages}
              className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-600 transition-colors"
            >
              {unreadMessages} yeni mesaj
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-amber-300/70">
          Mağaza adı bir kez belirlenir ve değiştirilemez.
        </p>
        <input
          id="store-name-input"
          type="text"
          placeholder="Mağaza adınız"
          className="mt-3 w-full rounded-lg border border-amber-500/30 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
        />
        {profileSaveError && (
          <p className="mt-2 text-xs text-red-400">{profileSaveError}</p>
        )}
        <button
          type="button"
          disabled={savingStoreName}
          onClick={onSaveStoreName}
          className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
        >
          {savingStoreName ? 'Kaydediliyor...' : 'Kaydet ve Kilitle'}
        </button>
      </div>
    )
  }

  if (storeName) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/40 bg-white/[0.03] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-300">
          {storeName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{storeName}</p>
          <p className="text-[10px] text-muted">Mağaza adı</p>
        </div>
        {unreadMessages > 0 && (
          <button
            type="button"
            onClick={onOpenMessages}
            className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-600 transition-colors"
          >
            {unreadMessages} yeni mesaj
          </button>
        )}
      </div>
    )
  }

  return null
}
