'use client';

import { useState } from 'react';
import Image from 'next/image';
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
  
  // 프리미엄 라이트 테마에 맞춘 카테고리별 컬러
  const getStyles = () => {
    if (category.includes('카페')) return 'bg-orange-50 text-orange-500 border-orange-100';
    if (category.includes('고기') || category.includes('육류')) return 'bg-rose-50 text-rose-500 border-rose-100';
    if (category.includes('술집') || category.includes('호프')) return 'bg-indigo-50 text-indigo-500 border-indigo-100';
    if (category.includes('관광') || category.includes('명소')) return 'bg-emerald-50 text-emerald-500 border-emerald-100';
    return 'bg-slate-50 text-slate-400 border-slate-200';
  };

  const styles = getStyles();

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center border ${styles} ${className}`}>
        <span className="text-3xl grayscale-[0.2]">{icon}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden border border-slate-100 ${className}`}>
      <Image 
        src={src} 
        alt={name}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        onError={() => setError(true)}
        className="object-cover transition-transform duration-700 hover:scale-110"
        unoptimized // 검색 결과 외부 이미지가 많으므로 호환성을 위해 unoptimized 설정하되 layout은 Image 컴포넌트 활용
      />
      {/* 라이트 테마용 매우 부드러운 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
    </div>
  );
}
