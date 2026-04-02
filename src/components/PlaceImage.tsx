'use client';

import { useState } from 'react';
import { getCategoryIcon } from '@/lib/categoryIcons';

interface PlaceImageProps {
  src?: string;
  name: string;
  category: string;
  className?: string;
}

export default function PlaceImage({ src, name, category, className = "" }: PlaceImageProps) {
  const [error, setError] = useState(false);
  const icon = getCategoryIcon(category, name);
  
  // 카테고리에 따라 배경색 결정 (카페-베이지, 고기-로즈, 술집-인디고 등)
  const getBgColor = () => {
    if (category.includes('카페')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    if (category.includes('고기') || category.includes('육류')) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    if (category.includes('술집') || category.includes('호프')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    if (category.includes('관광') || category.includes('명소')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    return 'bg-slate-800 text-slate-500 border-white/5';
  };

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center border ${getBgColor()} ${className}`}>
        <span className="text-3xl filter grayscale-[0.2]">{icon}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden border border-white/5 ${className}`}>
      <img 
        src={src} 
        alt={name}
        onError={() => setError(true)}
        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>
  );
}
