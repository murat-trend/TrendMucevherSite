"use client";

import { Scissors, FileText, Compass, Sparkles, Smartphone, Lightbulb, CheckSquare } from 'lucide-react';

export function DiyGuide() {
  const steps = [
    {
      icon: <FileText className="w-5 h-5" style={{ color: '#b76e79' }} />,
      title: '1. Malzemeleri Hazırlayın',
      desc: 'Sert şeffaf plastik levha (asetat, şeffaf dosya kapağı veya düz kenarlı PET şişe), ince uçlu asetat kalemi, makas veya maket bıçağı, şeffaf bant ve cetvel.'
    },
    {
      icon: <Compass className="w-5 h-5" style={{ color: '#b76e79' }} />,
      title: '2. Şablonu Çizin',
      desc: 'Şablon Oluşturucu sekmesine gidin. Ekran parlaklığını maksimuma alın. Şeffaf plastiği ekranın üstüne koyarak şablon çizgilerini asetat kalemiyle çizin.'
    },
    {
      icon: <Scissors className="w-5 h-5" style={{ color: '#b76e79' }} />,
      title: '3. Hassas Kesim Yapın',
      desc: 'Çizilen sınır çizgileri boyunca makas veya maket bıçağıyla düzgünce kesin. Daha temiz kenar için cetvel eşliğinde maket bıçağını kullanın.'
    },
    {
      icon: <Sparkles className="w-5 h-5" style={{ color: '#b76e79' }} />,
      title: '4. Katlayın ve Birleştirin',
      desc: '4 parçayı iç birleşim çizgileri boyunca hafifçe bükerek ters çevrilmiş, tepe açık bir piramit oluşturun. Birleşim noktalarını şeffaf bantla sabitleyin.'
    },
    {
      icon: <Smartphone className="w-5 h-5" style={{ color: '#b76e79' }} />,
      title: '5. Projeksiyonu Başlatın',
      desc: 'Bu sayfada hologram modunu açın, cihazı düz bir yüzeye koyun. Piramidin küçük ucunu ekranın tam ortasındaki kırmızı hedef noktasına hizalayın.'
    }
  ];

  const proTips = [
    { title: 'Tam Karanlık', desc: 'Odanın tamamen karanlık olması hologramın havada parlama etkisini dramatik biçimde artırır. Tüm ışık kaynaklarını söndürün.' },
    { title: 'Ekran %100 Parlaklık', desc: 'Projeksiyonun net ve parlak olması için telefon/tablet parlaklığını en yükseğe alın.' },
    { title: 'Temiz ve Çiziksiz Plastik', desc: 'Plastiğin temiz ve pürüzsüz olması yansımayı doğrudan etkiler. Mikrofiber bezle silin.' },
    { title: 'Göz Hizasından Bakın', desc: 'Hologram etkisini görmek için yukarıdan değil, piramidin yan yüzeylerinin tam karşısından bakın.' }
  ];

  return (
    <div className="space-y-8">
      {/* Checklist */}
      <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
        <h4 className="font-semibold text-white/90 mb-4 flex items-center gap-2 text-sm">
          <CheckSquare className="w-5 h-5" style={{ color: '#b76e79' }} />
          Gerekli Malzemeler
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white/60">
          <div className="space-y-2.5">
            {['Sert şeffaf plastik levha (asetat, dosya kabı veya PET şişe)', 'Kaliteli makas veya maket bıçağı', 'İnce uçlu asetat kalemi'].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(183,110,121,0.2)', border: '1px solid #b76e79' }}>
                  <span className="text-[10px]" style={{ color: '#b76e79' }}>✓</span>
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2.5">
            {['Şeffaf bant veya sıvı yapıştırıcı', 'Hassas cetvel', 'Mikrofiber temizlik bezi'].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(183,110,121,0.2)', border: '1px solid #b76e79' }}>
                  <span className="text-[10px]" style={{ color: '#b76e79' }}>✓</span>
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step by Step */}
      <div className="space-y-5 relative border-l-2 border-[#b76e79]/30 ml-4 pl-6">
        {steps.map((step, idx) => (
          <div key={idx} className="relative">
            <span className="absolute -left-10 top-0.5 flex items-center justify-center w-8 h-8 rounded-full border-2 border-[#b76e79]" style={{ background: '#0a0b0e' }}>
              {step.icon}
            </span>
            <h5 className="font-semibold text-sm text-white/90 mb-1">{step.title}</h5>
            <p className="text-xs text-white/55 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Pro Tips */}
      <div className="pt-6 border-t border-white/10">
        <h4 className="font-semibold text-white/90 mb-4 flex items-center gap-1.5 text-sm">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          Hologram Kalitesini Artıracak İpuçları
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proTips.map((tip, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h5 className="font-semibold text-xs text-white/90 flex items-center gap-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                {tip.title}
              </h5>
              <p className="text-[11px] text-white/50 leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
