/*
 * Dekoratif panel önizlemesi — Kimi tasarımındaki ekran görüntüsü
 * slotlarının (hero-dashboard.jpg vb.) yer tutucusu. Gerçek ekran
 * görüntüleri geldiğinde <img> ile değiştirilecek.
 */
export function MockShot() {
  const bars = [42, 68, 55, 80, 62, 90, 74, 58, 85, 70, 96, 78];
  return (
    <div aria-hidden className="relative aspect-[16/10] w-full bg-[#0A0812] select-none">
      {/* Pencere üst çubuğu */}
      <div className="absolute top-0 left-0 right-0 h-8 border-b border-white/[0.06] flex items-center gap-1.5 px-3">
        <span className="w-2 h-2 rounded-full bg-white/10" />
        <span className="w-2 h-2 rounded-full bg-white/10" />
        <span className="w-2 h-2 rounded-full bg-[#D4AF37]/40" />
        <span className="ml-3 h-2 w-24 rounded bg-white/[0.06]" />
      </div>
      {/* Sol menü şeridi */}
      <div className="absolute top-8 bottom-0 left-0 w-[18%] border-r border-white/[0.06] p-3 space-y-2.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded ${i === 0 ? "bg-[#D4AF37]/50" : "bg-white/[0.08]"}`} />
            <span className={`h-1.5 rounded flex-1 ${i === 0 ? "bg-white/20" : "bg-white/[0.06]"}`} />
          </div>
        ))}
      </div>
      {/* İçerik */}
      <div className="absolute top-8 bottom-0 left-[18%] right-0 p-4 flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-1.5">
              <span className={`block w-4 h-4 rounded ${i === 0 ? "bg-[#D4AF37]/40" : "bg-[#9B7FD4]/30"}`} />
              <span className="block h-2 w-3/4 rounded bg-white/15" />
              <span className="block h-1.5 w-1/2 rounded bg-white/[0.07]" />
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 flex items-end gap-1.5">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${h}%`,
                background:
                  i % 3 === 0
                    ? "linear-gradient(180deg, rgba(212,175,55,0.55), rgba(212,175,55,0.12))"
                    : "linear-gradient(180deg, rgba(155,127,212,0.5), rgba(155,127,212,0.1))",
              }}
            />
          ))}
        </div>
        <div className="space-y-1.5">
          <span className="block h-1.5 w-full rounded bg-white/[0.06]" />
          <span className="block h-1.5 w-5/6 rounded bg-white/[0.05]" />
          <span className="block h-1.5 w-2/3 rounded bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
