(function () {
  "use strict";

  var BASE = "https://trendmucevher.com";

  function getFirmSlug() {
    var scripts = document.querySelectorAll("script[data-nextaura-firm]");
    if (scripts.length > 0) return scripts[scripts.length - 1].getAttribute("data-nextaura-firm");
    // Fallback: script src ?firm= param
    var src = document.currentScript && document.currentScript.getAttribute("src");
    if (src) {
      var m = src.match(/[?&]firm=([^&]+)/);
      if (m) return decodeURIComponent(m[1]);
    }
    return null;
  }

  function getAccent() {
    var scripts = document.querySelectorAll("script[data-nextaura-color]");
    if (scripts.length > 0) return scripts[scripts.length - 1].getAttribute("data-nextaura-color");
    return "#b76e79";
  }

  var slug = getFirmSlug();
  if (!slug) { console.warn("[Nextaura] data-nextaura-firm eksik"); return; }

  var accent = getAccent();

  // --- Floating button ---
  var btn = document.createElement("button");
  btn.id = "nextaura-launch";
  btn.textContent = "✦ Tasarla";
  btn.setAttribute("aria-label", "Nextaura ile mücevher tasarla");
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483646",
    padding: "14px 22px",
    borderRadius: "50px",
    border: "1px solid " + accent,
    background: "#0a0a0a",
    color: accent,
    fontFamily: "system-ui, sans-serif",
    fontSize: "14px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    cursor: "pointer",
    boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px " + accent + "33",
    transition: "transform 0.15s, box-shadow 0.15s",
  });
  btn.onmouseenter = function () { btn.style.transform = "scale(1.05)"; };
  btn.onmouseleave = function () { btn.style.transform = "scale(1)"; };
  document.body.appendChild(btn);

  // --- Modal iframe ---
  var overlay = document.createElement("div");
  overlay.id = "nextaura-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    background: "rgba(0,0,0,0.7)",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
  });

  var frame = document.createElement("iframe");
  frame.src = BASE + "/nextaura/" + encodeURIComponent(slug) + "?embed=1";
  frame.title = "Nextaura Mücevher Tasarımcı";
  frame.allow = "microphone; camera";
  Object.assign(frame.style, {
    width: "min(480px, 100vw)",
    height: "min(800px, 100dvh)",
    border: "none",
    borderRadius: "20px",
    background: "#0a0a0a",
    boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
  });

  var closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.setAttribute("aria-label", "Kapat");
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "16px",
    right: "20px",
    background: "rgba(255,255,255,0.1)",
    border: "none",
    color: "white",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    fontSize: "16px",
    cursor: "pointer",
    zIndex: "1",
  });

  var wrapper = document.createElement("div");
  wrapper.style.cssText = "position:relative;display:flex;";
  wrapper.appendChild(frame);
  wrapper.appendChild(closeBtn);
  overlay.appendChild(wrapper);
  document.body.appendChild(overlay);

  function open() {
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
  function close() {
    overlay.style.display = "none";
    document.body.style.overflow = "";
  }

  btn.onclick = open;
  closeBtn.onclick = close;
  overlay.onclick = function (e) { if (e.target === overlay) close(); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  // Listen for order/share events from iframe
  window.addEventListener("message", function (e) {
    if (e.origin !== BASE) return;
    if (e.data && e.data.type === "nextaura:close") close();
  });
})();
