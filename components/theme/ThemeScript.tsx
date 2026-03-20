export function ThemeScript() {
  const script = `(function(){var k='trendmucevher-theme';var s=localStorage.getItem(k);var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='light'||s==='dark'?s:(d?'dark':'light');var e=document.documentElement;e.classList.toggle('dark',t==='dark');e.classList.toggle('light',t==='light');})();`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
