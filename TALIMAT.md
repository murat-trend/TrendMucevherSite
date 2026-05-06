"Evet" de, devam etsin. Claude Code'a yapıştır:

4 sayfa için de şunu yap: her birinde 'use client' olan kısmı ayrı bir Client component'a taşı, page.tsx'i server component yap ve İngilizce statik metadata ekle:

iletisim: title: "Contact Us | Trend Mücevher", description: "Get in touch with Trend Mücevher. Questions about 3D jewelry models, custom orders or partnerships."
hakkimizda: title: "About | Trend Mücevher", description: "Murat Kaynaroğlu — jewelry designer since 2005. Creator of cast-ready 3D jewelry models for workshops worldwide."
nasil-calisir: title: "How It Works | Trend Mücevher", description: "Download cast-ready STL and GLB jewelry models. Buy, download, produce — instant digital delivery."
fiyatlandirma: title: "Pricing | Trend Mücevher", description: "Personal and commercial license options for professional 3D jewelry models. Instant download, ready for casting."

Her sayfa için canonical da ekle: https://trendmucevher.com/{sayfa-slug}/