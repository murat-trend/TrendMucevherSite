"use client";

/**
 * İç boşaltma sırasında gösterilen sihirli "sanal sıvı" simülasyonu.
 * Pembe ışıltılı sıvı yükselir (flood-fill), cadı süpürgeyle uçar,
 * asasının ucundan yıldız havai fişekleri çıkar. Remaura pembesi.
 */
export function HollowMagicOverlay({ visible, label, title }: { visible: boolean; label?: string; title?: string }) {
  if (!visible) return null;
  return (
    <div className="rm-magic-root">
      <style>{CSS}</style>
      <div className="rm-magic-card">
        {/* Sıvı haznesi */}
        <div className="rm-vessel">
          <div className="rm-liquid">
            <div className="rm-wave" />
            <div className="rm-wave rm-wave2" />
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="rm-bubble" style={{ left: `${6 + i * 8}%`, animationDelay: `${(i % 6) * 0.4}s`, animationDuration: `${2.4 + (i % 4) * 0.5}s` }} />
            ))}
          </div>

          {/* Cadı süpürgeyle uçuyor */}
          <div className="rm-witch">
            <svg width="92" height="76" viewBox="0 0 92 76" fill="none">
              {/* süpürge sapı */}
              <rect x="14" y="46" width="58" height="4" rx="2" transform="rotate(-8 14 46)" fill="#7a5230" />
              {/* süpürge ucu */}
              <g transform="rotate(-8 72 44)">
                <path d="M70 38 L88 42 L70 50 Z" fill="#c69575" />
                <path d="M72 40 L88 42 M72 44 L88 46 M72 47 L86 49" stroke="#a9764f" strokeWidth="1" />
              </g>
              {/* gövde (mor cübbe) */}
              <path d="M34 24 q10 -6 18 2 l4 20 q-12 6 -24 0 Z" fill="#6d4aa6" />
              {/* yüz */}
              <circle cx="44" cy="20" r="9" fill="#f0c8a8" />
              {/* şapka */}
              <path d="M33 14 q11 -20 22 0 Z" fill="#5a3a96" />
              <ellipse cx="44" cy="14" rx="15" ry="3.5" fill="#5a3a96" />
              <circle cx="44" cy="-2" r="2.4" fill="#ffd966" />
              {/* asa */}
              <line x1="56" y1="26" x2="74" y2="14" stroke="#8a5a2b" strokeWidth="2.4" strokeLinecap="round" />
              <g className="rm-wandstar"><Star x={75} y={12} s={7} /></g>
            </svg>
            {/* asadan çıkan yıldız havai fişekleri */}
            <div className="rm-sparks">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className="rm-spark" style={{ ['--a' as string]: `${(i / 10) * 360}deg`, animationDelay: `${(i % 5) * 0.18}s` }}>✦</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rm-title">{title ?? "✨ Sihirli İşlem"}</div>
        <div className="rm-sub">{label ?? "İşleniyor…"}</div>
      </div>
    </div>
  );
}

function Star({ x, y, s }: { x: number; y: number; s: number }) {
  const pts = Array.from({ length: 10 }).map((_, i) => {
    const r = i % 2 === 0 ? s : s * 0.42;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
  }).join(" ");
  return <polygon points={pts} fill="#ffd966" />;
}

const CSS = `
.rm-magic-root{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;
  background:rgba(7,8,10,.78);backdrop-filter:blur(6px)}
.rm-magic-card{width:340px;max-width:88vw;border-radius:24px;padding:26px 22px 24px;text-align:center;
  background:radial-gradient(120% 90% at 50% 0%,rgba(183,110,121,.18),rgba(10,11,14,.96));
  border:1px solid rgba(230,179,187,.25);box-shadow:0 0 60px rgba(183,110,121,.35),0 20px 60px rgba(0,0,0,.6)}
.rm-vessel{position:relative;width:200px;height:200px;margin:0 auto 18px;border-radius:50%;overflow:hidden;
  border:2px solid rgba(230,179,187,.35);box-shadow:inset 0 0 40px rgba(183,110,121,.35),0 0 30px rgba(196,131,139,.4)}
.rm-liquid{position:absolute;left:0;right:0;bottom:0;height:35%;
  background:linear-gradient(180deg,#e6b3bb,#c4838b 40%,#a65f69);
  animation:rm-fill 3.2s ease-in-out infinite alternate;filter:saturate(1.2)}
.rm-liquid::after{content:"";position:absolute;inset:0;mix-blend-mode:screen;opacity:.55;
  background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.6) 50%,transparent 70%);
  background-size:200% 100%;animation:rm-shimmer 1.8s linear infinite}
@keyframes rm-fill{0%{height:26%}100%{height:70%}}
@keyframes rm-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.rm-wave{position:absolute;top:-14px;left:-25%;width:150%;height:28px;border-radius:50%;
  background:#e6b3bb;opacity:.85;animation:rm-waveX 3s ease-in-out infinite}
.rm-wave2{top:-10px;background:#c4838b;opacity:.6;animation-duration:2.2s;animation-direction:reverse}
@keyframes rm-waveX{0%,100%{transform:translateX(-6%)}50%{transform:translateX(6%)}}
.rm-bubble{position:absolute;bottom:0;width:7px;height:7px;border-radius:50%;
  background:rgba(255,255,255,.7);box-shadow:0 0 6px rgba(255,230,235,.9);
  animation:rm-rise linear infinite}
@keyframes rm-rise{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(-180px);opacity:0}}
.rm-witch{position:absolute;top:14%;left:-30%;animation:rm-fly 4s ease-in-out infinite}
@keyframes rm-fly{0%{transform:translate(-30px,0) rotate(-3deg)}50%{transform:translate(150px,-18px) rotate(2deg)}100%{transform:translate(330px,4px) rotate(-3deg)}}
.rm-wandstar{transform-origin:75px 12px;animation:rm-twinkle .9s ease-in-out infinite}
@keyframes rm-twinkle{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.7}}
.rm-sparks{position:absolute;top:-2px;left:74px;width:0;height:0}
.rm-spark{position:absolute;font-size:11px;color:#ffd966;text-shadow:0 0 6px #ffd966;
  animation:rm-burst 1.4s ease-out infinite}
@keyframes rm-burst{0%{transform:rotate(var(--a)) translateX(0) scale(.3);opacity:0}
  20%{opacity:1}100%{transform:rotate(var(--a)) translateX(34px) scale(1);opacity:0}}
.rm-title{font-family:Georgia,serif;font-size:20px;font-weight:600;color:#f5f3f0;letter-spacing:.5px}
.rm-sub{margin-top:6px;font-size:12.5px;color:#e6b3bb;opacity:.85}
`;
