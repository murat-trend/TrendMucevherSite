'use client'
import { type ContentSourceLocale } from '@/lib/modeller/product-translations-anthropic'
import { type EditFormState } from '@/hooks/useSaticiProducts'

interface Props {
  editForm: EditFormState
  editSaving: boolean
  editError: string | null
  onSave: () => void
  onCancel: () => void
  onChange: (form: EditFormState) => void
}

export function UrunDuzenleModal({
  editForm,
  editSaving,
  editError,
  onSave,
  onCancel,
  onChange,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-[#0f1117] p-6">

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Ürünü Düzenle</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">

          <label className="block">
            <span className="mb-1 block text-xs text-muted">Ürün Adı</span>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => onChange({ ...editForm, name: e.target.value })}
              className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-muted">Ürün Hikayesi</span>
            <textarea
              value={editForm.story}
              onChange={(e) => onChange({ ...editForm, story: e.target.value })}
              rows={4}
              className="w-full resize-none rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-muted">Satıcı Notu</span>
            <textarea
              value={editForm.sellerNote}
              onChange={(e) => onChange({ ...editForm, sellerNote: e.target.value })}
              rows={2}
              placeholder="Opsiyonel — alıcıya kısa pratik not"
              className="w-full resize-none rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/40"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-muted">İçerik Dili</span>
            <p className="mb-1 text-[11px] text-muted/70">
              Yukarıdaki metni hangi dilde yazdığınızı seçin — diğer diller otomatik çevrilir.
            </p>
            <select
              value={editForm.contentSourceLang}
              onChange={(e) =>
                onChange({
                  ...editForm,
                  contentSourceLang: e.target.value as ContentSourceLocale,
                })
              }
              className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="ru">Русский</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-muted">Fiyat (₺)</span>
            <input
              type="number"
              value={editForm.personal_price}
              onChange={(e) =>
                onChange({ ...editForm, personal_price: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
            />
          </label>

        </div>

        {editError && (
          <p className="mt-3 text-xs text-red-400">{editError}</p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border/40 py-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={editSaving}
            className="flex-1 rounded-lg bg-[#c9a84c] py-2 text-sm font-semibold text-black disabled:opacity-50 hover:bg-[#d4b060] transition-colors"
          >
            {editSaving ? 'Güncelleniyor...' : 'Güncelle'}
          </button>
        </div>

      </div>
    </div>
  )
}
