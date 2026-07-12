"use client";

// Bölüm başlığı kalıbı: etiket + (düz + altın + düz) başlık + açıklama.
// Başlık üç parçalıdır çünkü altın vurgulu kelimenin yeri dilden dile değişir.
export function SectionHeader({
  tag,
  pre,
  gold,
  post,
  desc,
  visible,
  className = "mb-16",
}: {
  tag: string;
  pre: string;
  gold: string;
  post: string;
  desc: string;
  visible: boolean;
  className?: string;
}) {
  return (
    <div
      className={`text-center transition-all duration-700 ${className} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <span className="tag-gold mb-4 inline-block">{tag}</span>
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mt-4">
        {pre && <>{pre} </>}
        <span className="gradient-text-gold">{gold}</span>
        {post && <> {post}</>}
      </h2>
      <p className="mt-4 text-lg text-[#94A3B8] max-w-2xl mx-auto">{desc}</p>
    </div>
  );
}
