import React from 'react';
import { Heart, Leaf, Feather, Gem, Compass, Flower2 } from 'lucide-react';
import { Language } from '../types';

interface TemplateThemeDecorationProps {
  templateSlug?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  language?: Language;
}

export const TemplateThemeDecoration: React.FC<TemplateThemeDecorationProps> = ({
  templateSlug = 'template-1',
  primaryColor = '#B48B47',
  secondaryColor = '#D9658B',
  accentColor = '#C9A96E',
  language = 'uz',
}) => {
  // Helper for bilingual badge title
  const getBadge = (uz: string, ru: string, en: string) => {
    if (language === 'ru') return ru;
    if (language === 'en') return en;
    return uz;
  };

  switch (templateSlug) {
    // 1. Aurelia Royal
    case 'template-1':
    case 'aurelia':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-amber-50/95 border border-[#B48B47]/40 shadow-xs">
            <span className="text-[#B48B47] text-xs">⚜️</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#5A451F]">
              {getBadge('Aurelia Royal Qirollik Kolleksiyasi', 'Королевская коллекция Aurelia Royal', 'Aurelia Royal Regal Collection')}
            </span>
            <span className="text-[#B48B47] text-xs">⚜️</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-80">
            <div className="w-14 h-px bg-gradient-to-r from-transparent via-[#B48B47] to-transparent" />
            <span className="text-[9px] text-[#B48B47]">✦</span>
            <div className="w-14 h-px bg-gradient-to-r from-transparent via-[#B48B47] to-transparent" />
          </div>
        </div>
      );

    // 2. White Serenade
    case 'template-2':
    case 'white-serenade':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/95 border border-rose-200 shadow-xs">
            <Flower2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-rose-900">
              {getBadge('White Serenade Oq Gullar Jilosi', 'Белая серенада • Цветочное сияние', 'White Serenade Floral Romance')}
            </span>
            <Flower2 className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-12 h-px bg-rose-200" />
            <span className="text-xs text-rose-300">🌸</span>
            <div className="w-12 h-px bg-rose-200" />
          </div>
        </div>
      );

    // 3. Velvet Sharqona
    case 'template-3':
    case 'velvet':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-[#184738]/10 border border-[#184738]/40 shadow-xs">
            <span className="text-[#184738] text-xs">🕌</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#184738]">
              {getBadge('Velvet Sharqona Milliy An’ana', 'Бархатный восток • Традиции', 'Velvet Sharqona Heritage')}
            </span>
            <span className="text-amber-600 text-xs">❖</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-12 h-px bg-[#184738]/40" />
            <span className="text-[9px] text-[#184738]">⚜</span>
            <div className="w-12 h-px bg-[#184738]/40" />
          </div>
        </div>
      );

    // 4. Golden Symphony
    case 'template-4':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-amber-50/90 border border-amber-300 shadow-xs">
            <span className="text-amber-500 text-xs">🎼</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-amber-900">
              {getBadge('Golden Symphony Oltin Simfoniya', 'Золотая симфония торжества', 'Golden Symphony Grand Gala')}
            </span>
            <span className="text-amber-500 text-xs">✦</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-14 h-px bg-amber-300" />
            <span className="text-[9px] text-amber-500">❖</span>
            <div className="w-14 h-px bg-amber-300" />
          </div>
        </div>
      );

    // 5. Emerald Grace
    case 'template-5':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-emerald-50/95 border border-emerald-300 shadow-xs">
            <Leaf className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-950">
              {getBadge('Emerald Grace Zumrad Jilolari', 'Изумрудное благородство', 'Emerald Grace Noble Luxe')}
            </span>
            <Leaf className="w-3.5 h-3.5 text-emerald-700 -scale-x-100" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-12 h-px bg-emerald-300" />
            <span className="text-xs text-emerald-600">🌿</span>
            <div className="w-12 h-px bg-emerald-300" />
          </div>
        </div>
      );

    // 6. Pastel Romance
    case 'template-6':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-pink-50/90 border border-pink-200 shadow-xs">
            <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-300" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-pink-900">
              {getBadge('Pastel Romance Nozik Pushti', 'Пастельная романтика', 'Pastel Romance Sweet Harmony')}
            </span>
            <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-300" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-12 h-px bg-pink-300" />
            <span className="text-xs text-pink-400">🌸</span>
            <div className="w-12 h-px bg-pink-300" />
          </div>
        </div>
      );

    // 7. Blush Elegance
    case 'template-7':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-rose-50/90 border border-rose-300/80 shadow-xs">
            <Flower2 className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-rose-950">
              {getBadge('Blush Elegance Nafis Atirgul', 'Пудровая элегантность', 'Blush Elegance English Rose')}
            </span>
            <Flower2 className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-14 h-px bg-rose-300" />
            <span className="text-[9px] text-rose-500">✦</span>
            <div className="w-14 h-px bg-rose-300" />
          </div>
        </div>
      );

    // 8. Minimalist Pure
    case 'template-8':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-stone-100/90 border border-stone-300 shadow-xs">
            <span className="text-stone-600 text-xs">◆</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-stone-800">
              {getBadge('Minimalist Pure Fransuz Estetikasi', 'Французский минимализм', 'Minimalist Pure Parisian Chic')}
            </span>
            <span className="text-stone-600 text-xs">◆</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-60">
            <div className="w-12 h-px bg-stone-300" />
            <span className="text-[9px] text-stone-500">✦</span>
            <div className="w-12 h-px bg-stone-300" />
          </div>
        </div>
      );

    // 9. Lavender Garden
    case 'template-9':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-purple-50/95 border border-purple-200 shadow-xs">
            <span className="text-purple-600 text-xs">🪻</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-purple-900">
              {getBadge('Lavender Garden Provans Nafosati', 'Лавандовый сад Прованса', 'Lavender Garden Provence Charm')}
            </span>
            <span className="text-purple-600 text-xs">🪻</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-12 h-px bg-purple-300" />
            <span className="text-xs text-purple-400">🌿</span>
            <div className="w-12 h-px bg-purple-300" />
          </div>
        </div>
      );

    // 10. Sapphire Night
    case 'template-10':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-[#0E1A30]/90 border border-sky-400/50 shadow-md backdrop-blur-md">
            <Gem className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-sky-200">
              {getBadge('Sapphire Midnight Safir Tuni', 'Сапфир Миднайт • Звездное небо', 'Sapphire Midnight Starlit Eve')}
            </span>
            <Gem className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-80">
            <div className="w-12 h-px bg-sky-400/50" />
            <span className="text-[9px] text-amber-300">★</span>
            <div className="w-12 h-px bg-sky-400/50" />
          </div>
        </div>
      );

    // 11. Vintage Ivory
    case 'template-11':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-amber-50/80 border border-amber-200/90 shadow-xs">
            <Feather className="w-3.5 h-3.5 text-amber-700" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-amber-900">
              {getBadge('Vintage Ivory Antik Fil Suyagi', 'Винтажная слоновая кость', 'Vintage Ivory Antique Warmth')}
            </span>
            <Feather className="w-3.5 h-3.5 text-amber-700 -scale-x-100" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-60">
            <div className="w-12 h-px bg-amber-300" />
            <span className="text-[9px] text-amber-600">✦</span>
            <div className="w-12 h-px bg-amber-300" />
          </div>
        </div>
      );

    // 12. Modern Calligraphy
    case 'template-12':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-neutral-900 text-white border border-neutral-700 shadow-md">
            <span className="text-amber-400 text-xs">🖋️</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-amber-300">
              {getBadge('Modern Calligraphy Nafis Xattotlik', 'Современная каллиграфия', 'Modern Calligraphy Flowing Ink')}
            </span>
            <span className="text-amber-400 text-xs">🖋️</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-14 h-px bg-amber-400/40" />
            <span className="text-[9px] text-amber-300">✦</span>
            <div className="w-14 h-px bg-amber-400/40" />
          </div>
        </div>
      );

    // 13. Royal Monogram
    case 'template-13':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-amber-100/90 border border-amber-300 shadow-xs">
            <span className="text-amber-800 text-xs">👑</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-amber-950">
              {getBadge('Royal Monogram Dabdabali Muhr', 'Королевская монограмма', 'Royal Monogram Heritage Crest')}
            </span>
            <span className="text-amber-800 text-xs">👑</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-80">
            <div className="w-14 h-px bg-amber-400" />
            <span className="text-[10px] text-amber-700">⚜</span>
            <div className="w-14 h-px bg-amber-400" />
          </div>
        </div>
      );

    // 14. Botanical Garden
    case 'template-14':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-emerald-50/90 border border-emerald-200 shadow-xs">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-900">
              {getBadge('Botanical Garden Evkalipt Bog‘i', 'Ботанический эвкалиптовый сад', 'Botanical Garden Sage Eucalyptus')}
            </span>
            <Leaf className="w-3.5 h-3.5 text-emerald-600 -scale-x-100" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-12 h-px bg-emerald-300" />
            <span className="text-xs text-emerald-500">🍃</span>
            <div className="w-12 h-px bg-emerald-300" />
          </div>
        </div>
      );

    // 15. Silk & Pearls
    case 'template-15':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-slate-50/90 border border-slate-200 shadow-xs">
            <Gem className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-800">
              {getBadge('Silk & Pearls Ipak va Marvarid', 'Шелк и сияющий жемчуг', 'Silk & Pearls Satin Sheen')}
            </span>
            <Gem className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-12 h-px bg-slate-300" />
            <span className="text-[9px] text-slate-400">✦</span>
            <div className="w-12 h-px bg-slate-300" />
          </div>
        </div>
      );

    // 16. Autumn Gold
    case 'template-16':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-orange-50/90 border border-orange-200 shadow-xs">
            <span className="text-orange-500 text-xs">🍂</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-orange-950">
              {getBadge('Autumn Gold Oltin Kuz Tantanasi', 'Золотая осень • Теплые тона', 'Autumn Gold Warm Embrace')}
            </span>
            <span className="text-orange-500 text-xs">🍂</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-12 h-px bg-orange-300" />
            <span className="text-[9px] text-orange-600">✦</span>
            <div className="w-12 h-px bg-orange-300" />
          </div>
        </div>
      );

    // 17. Rose Gold Velvet
    case 'template-17':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-rose-50/90 border border-rose-300 shadow-xs">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-300" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-rose-950">
              {getBadge('Rose Gold Velvet Atirgul Zari', 'Бархат цвета розового золота', 'Rose Gold Velvet Luxury')}
            </span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-300" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-12 h-px bg-rose-300" />
            <span className="text-xs text-rose-400">🌸</span>
            <div className="w-12 h-px bg-rose-300" />
          </div>
        </div>
      );

    // 18. Royal Ruby
    case 'template-18':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-[#3B0B18]/90 border border-rose-400/50 shadow-md backdrop-blur-md">
            <span className="text-rose-400 text-xs">💎</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-rose-200">
              {getBadge('Royal Ruby Qirollik Yoquti', 'Королевский Рубин • Бархат', 'Royal Ruby Crimson Velvet')}
            </span>
            <span className="text-amber-400 text-xs">⚜️</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-80">
            <div className="w-12 h-px bg-rose-400/50" />
            <span className="text-[9px] text-amber-300">✦</span>
            <div className="w-12 h-px bg-rose-400/50" />
          </div>
        </div>
      );

    // 19. Modern Noir
    case 'template-19':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-slate-900/95 border border-amber-400/50 shadow-md backdrop-blur-md">
            <span className="text-amber-400 text-xs">⚜️</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-amber-300">
              {getBadge('Modern Noir Obsidian Qora va Oltin', 'Modern Noir • Черный и золото', 'Modern Noir Obsidian Gold')}
            </span>
            <span className="text-amber-400 text-xs">⚜️</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-80">
            <div className="w-14 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            <span className="text-[9px] text-amber-300">✦</span>
            <div className="w-14 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          </div>
        </div>
      );

    // 20. Sweet Butterfly
    case 'template-20':
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-cyan-50/90 border border-cyan-200 shadow-xs">
            <span className="text-cyan-600 text-xs">🦋</span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-cyan-950">
              {getBadge('Sweet Butterfly Nozik Kapalaklar', 'Нежная бабочка • Сад любви', 'Sweet Butterfly Enchanted Garden')}
            </span>
            <span className="text-cyan-600 text-xs">🦋</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1.5 opacity-70">
            <div className="w-12 h-px bg-cyan-300" />
            <span className="text-[9px] text-cyan-500">✦</span>
            <div className="w-12 h-px bg-cyan-300" />
          </div>
        </div>
      );

    default:
      return (
        <div className="relative pointer-events-none select-none my-2 text-center">
          <div className="inline-flex items-center gap-2 py-1 px-3.5 rounded-full bg-white/90 border border-black/10 shadow-xs">
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#5A451F]">
              {getBadge('Taklifim Saroy Kolleksiyasi', 'Коллекция Taklifim', 'Taklifim Signature Suite')}
            </span>
          </div>
        </div>
      );
  }
};

export default TemplateThemeDecoration;
