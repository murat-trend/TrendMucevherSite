export default function OnayBekleniyorPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-16 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-2xl mb-6">
        ⏳
      </div>
      <h1 className="font-display text-xl font-medium text-foreground">
        Onay bekleniyor
      </h1>
      <p className="mt-3 max-w-md mx-auto text-sm text-muted leading-relaxed">
        Satıcı hesabınız inceleniyor. Onaylandığında e-posta ile bildirim alacaksınız
        ve satıcı paneline tam erişim açılacaktır.
      </p>
      <p className="mt-6 text-xs text-muted/60">
        Başvurunuzla ilgili soru için{" "}
        <a
          href="mailto:destek@trendmucevher.com"
          className="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          destek@trendmucevher.com
        </a>
      </p>
    </div>
  );
}
