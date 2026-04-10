"use client"

import { useEffect, useState } from "react"
import type React from "react"
import { createClient } from "@/utils/supabase/client"
import { SaticiNav } from "@/app/(site)/satici/dashboard/page"

export default function HesabimPage() {
  const [storeName, setStoreName] = useState("")
  const [bio, setBio] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [storeNameLocked, setStoreNameLocked] = useState(false)
  const [iban, setIban] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setEmail(user.email ?? "")
      const { data: profile } = await supabase
        .from("profiles")
        .select("store_name, store_name_locked, bio, whatsapp_number, iban, bank_name, account_holder, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
      if (profile) {
        setStoreName(profile.store_name ?? "")
        setBio(profile.bio ?? "")
        setWhatsapp(profile.whatsapp_number ?? "")
        setStoreNameLocked(profile.store_name_locked ?? false)
        setIban(profile.iban ?? "")
        setBankName(profile.bank_name ?? "")
        setAccountHolder(profile.account_holder ?? "")
        setAvatarUrl(profile.avatar_url ?? null)
      }
      setLoading(false)
    }
    void load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from("profiles").upsert({
      id: user.id,
      bio,
      whatsapp_number: whatsapp,
      iban,
      bank_name: bankName,
      account_holder: accountHolder,
      avatar_url: avatarUrl,
      ...(storeNameLocked ? {} : { store_name: storeName, store_name_locked: storeName.trim() !== "" }),
    }, { onConflict: "id" })
    if (storeName.trim() !== "") setStoreNameLocked(true)
    setSuccess(true)
    setSaving(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAvatarUploading(false); return }
    const ext = file.name.split(".").pop()
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    }
    setAvatarUploading(false)
  }

  const handlePasswordUpdate = async () => {
    if (!newPassword.trim() || newPassword.length < 6) return
    setPasswordSaving(true)
    setPasswordSuccess(false)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError("Şifre güncellenemedi: " + error.message)
      setPasswordSaving(false)
      return
    }
    setPasswordSuccess(true)
    setPasswordError(null)
    setNewPassword("")
    setPasswordSaving(false)
    setTimeout(() => setPasswordSuccess(false), 3000)
  }

  if (loading) return (
    <div className="p-8"><SaticiNav active="Hesabım" /><p className="text-sm text-muted mt-4">Yükleniyor...</p></div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <SaticiNav active="Hesabım" />
      <h1 className="font-display text-2xl text-foreground mt-6 mb-6">Hesabım</h1>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border/40 bg-surface p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-4">Şifre Güncelle</p>
          <label className="block">
            <span className="text-xs text-muted mb-1 block">Yeni Şifre</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 6 karakter"
              className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
            />
          </label>
          {passwordSuccess && <p className="mt-2 text-xs text-emerald-400">✓ Şifre güncellendi.</p>}
          {passwordError && <p className="mt-2 text-xs text-red-400">{passwordError}</p>}
          <button
            type="button"
            onClick={() => void handlePasswordUpdate()}
            disabled={passwordSaving || newPassword.length < 6}
            className="mt-3 rounded-lg border border-border/40 px-4 py-2 text-xs text-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            {passwordSaving ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>
        </div>

        <div className="rounded-xl border border-border/40 bg-surface p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover border-2 border-[#c9a84c]/40" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-amber-500/20 flex items-center justify-center text-xl font-bold text-amber-300">
                  {storeName.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{storeName || "Mağaza Adı"}</p>
              <label className="mt-1 cursor-pointer text-xs text-[#c9a84c] hover:underline">
                {avatarUploading ? "Yükleniyor..." : "Fotoğraf Değiştir"}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-4">Mağaza Bilgileri</p>

          <label className="block mb-3">
            <span className="text-xs text-muted mb-1 block">Mağaza Adı {storeNameLocked && <span className="text-amber-400 text-[10px]">(kilitli — değiştirilemez)</span>}</span>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              disabled={storeNameLocked}
              placeholder="Mağaza adınız..."
              className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none disabled:opacity-50"
            />
          </label>

          <label className="block mb-3">
            <span className="text-xs text-muted mb-1 block">Mağaza Açıklaması</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Mağazanız hakkında kısa bir açıklama..."
              rows={3}
              className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none resize-none"
            />
          </label>
        </div>

        <div className="rounded-xl border border-border/40 bg-surface p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-4">İletişim Bilgileri</p>

          <label className="block mb-3">
            <span className="text-xs text-muted mb-1 block">Email (değiştirilemez)</span>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none opacity-50"
            />
          </label>

          <label className="block">
            <span className="text-xs text-muted mb-1 block">WhatsApp Numarası</span>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+90 5xx xxx xx xx"
              className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
            />
          </label>
        </div>

        <div className="rounded-xl border border-border/40 bg-surface p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-4">Banka Bilgileri</p>
          <p className="text-[11px] text-muted/70 mb-3">Ödeme transferleri için gereklidir. Bilgileriniz güvende tutulur.</p>

          <label className="block mb-3">
            <span className="text-xs text-muted mb-1 block">Hesap Sahibi Adı</span>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Ad Soyad veya Şirket Adı"
              className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
            />
          </label>

          <label className="block mb-3">
            <span className="text-xs text-muted mb-1 block">Banka Adı</span>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Örn: Halkbank, Ziraat, Garanti"
              className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs text-muted mb-1 block">IBAN</span>
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              maxLength={32}
              className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none font-mono"
            />
          </label>
        </div>

        {success && (
          <p className="text-sm text-emerald-400">✓ Bilgiler kaydedildi.</p>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-[#c9a84c] px-6 py-2.5 text-sm font-semibold text-black hover:bg-[#b8973b] transition-colors disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  )
}
