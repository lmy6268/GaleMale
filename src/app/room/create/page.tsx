'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronLeft, Home } from 'lucide-react';
import MapComponent, { MapPlace } from '@/components/MapComponent';

interface PlaceOption {
  placeId: string;
  name: string;
  address: string;
  category: string;
  rating?: number;
  placeUrl?: string;
  x: string;
  y: string;
  imageUrl?: string;
}

interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  category_group_name?: string;
  road_address_name?: string;
  address_name: string;
  place_url: string;
  x: string;
  y: string;
  imageUrl?: string;
}

export default function CreateRoomPage() {
  const { status } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [minDate, setMinDate] = useState('');
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [allowAddOptions, setAllowAddOptions] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingMore, setIsSearchingMore] = useState(false);
  const [searchCenter, setSearchCenter] = useState<{ x: string; y: string } | null>(null);
  const [mapTargetCenter, setMapTargetCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [lastSearchCoord, setLastSearchCoord] = useState<{ x: string; y: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [isEnd, setIsEnd] = useState(true);
  const [originalCenter, setOriginalCenter] = useState<{ lat: number; lng: number } | null>(null);
  
  const [fixedPlaceId, setFixedPlaceId] = useState<string | null>(null);
  const [isAutoPanning, setIsAutoPanning] = useState(false);
  const [baseCenter, setBaseCenter] = useState<{ lat: number; lng: number } | null>(null);

  const mapPlaces = useMemo(() => 
    places.map(p => ({ placeId: p.placeId, name: p.name, x: p.x, y: p.y })),
    [places]
  );

  const mapSearchResults = useMemo(() => 
    searchResults.map(item => ({ placeId: item.id, name: item.place_name, x: item.x, y: item.y })),
    [searchResults]
  );

  useEffect(() => {
    if (searchCenter && hoveredPlaceId === null && fixedPlaceId === null) {
      setBaseCenter({
        lat: Number(searchCenter.y),
        lng: Number(searchCenter.x)
      });
      setIsAutoPanning(false);
    }
    
    if (fixedPlaceId && !isAutoPanning && searchCenter && lastSearchCoord) {
      setFixedPlaceId(null);
    }
  }, [searchCenter, hoveredPlaceId, fixedPlaceId, isAutoPanning, lastSearchCoord]);

  useEffect(() => {
    const now = new Date();
    const defaultDeadline = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    
    // 로컬 시간 기준으로 날짜와 시간 추출
    const year = defaultDeadline.getFullYear();
    const month = String(defaultDeadline.getMonth() + 1).padStart(2, '0');
    const day = String(defaultDeadline.getDate()).padStart(2, '0');
    const hours = String(defaultDeadline.getHours()).padStart(2, '0');
    const minutes = String(defaultDeadline.getMinutes()).padStart(2, '0');

    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hours}:${minutes}`;
    
    setDeadlineDate(dateStr);
    setDeadlineTime(timeStr);
    
    // 오늘 날짜 최소값 설정 (로컬 기준)
    const nowYear = now.getFullYear();
    const nowMonth = String(now.getMonth() + 1).padStart(2, '0');
    const nowDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${nowYear}-${nowMonth}-${nowDay}`;
    setMinDate(todayStr);
  }, []);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = useCallback(async (reset: boolean = true) => {
    if (!debouncedSearchQuery.trim() && !categoryFilter) return;
    
    const targetPage = reset ? 1 : page + 1;
    if (reset) {
      setIsSearching(true);
      setSearchResults([]);
    } else {
      setIsSearchingMore(true);
    }

    try {
      let url = `/api/search?page=${targetPage}`;
      if (debouncedSearchQuery.trim()) url += `&q=${encodeURIComponent(debouncedSearchQuery)}`;
      if (categoryFilter) url += `&category_group_code=${categoryFilter}`;
      if (searchCenter) url += `&x=${searchCenter.x}&y=${searchCenter.y}&radius=3000`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        if (reset) {
          const results: KakaoPlace[] = data.results || [];
          const uniqueResults = results.filter((item, index, self) => 
            index === self.findIndex((t) => t.id === item.id)
          );
          setSearchResults(uniqueResults);
          setLastSearchCoord(searchCenter);
        } else {
          setSearchResults(prev => {
            const newResults: KakaoPlace[] = data.results || [];
            const existingIds = new Set(prev.map(item => item.id));
            const uniqueNewResults = newResults.filter(item => !existingIds.has(item.id));
            return [...prev, ...uniqueNewResults];
          });
        }
        setIsEnd(data.meta?.is_end ?? true);
        setPage(targetPage);
      } else {
        alert('검색 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
      setIsSearchingMore(false);
    }
  }, [debouncedSearchQuery, categoryFilter, page, searchCenter]);

  useEffect(() => {
    if (debouncedSearchQuery.trim() || categoryFilter) {
      handleSearch(true);
    }
  }, [categoryFilter, debouncedSearchQuery]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (isSearching || isSearchingMore || isEnd) return;

    const sentinel = document.getElementById('search-sentinel');
    if (!sentinel) return;

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        handleSearch(false);
      }
    }, { threshold: 0.1 });

    observerRef.current.observe(sentinel);
    return () => observerRef.current?.disconnect();
  }, [isSearching, isSearchingMore, isEnd, handleSearch]);

  const handleAddPlace = useCallback((item: KakaoPlace) => {
    const isAlreadyInPlaces = places.some(p => p.placeId === item.id);
    if (!isAlreadyInPlaces) {
      const categoryClean = item.category_name.split(' > ').pop();
      const mainCategory = item.category_group_name || item.category_name.split(' > ')[0];
      
      setPlaces([...places, {
        placeId: item.id,
        name: item.place_name,
        address: item.road_address_name || item.address_name,
        category: `${mainCategory} > ${categoryClean}`,
        placeUrl: item.place_url,
        x: item.x,
        y: item.y
      }]);
    }
  }, [places]);

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') router.replace('/');
    return null;
  }

  const handleRemovePlace = (placeId: string) => {
    setPlaces(places.filter(p => p.placeId !== placeId));
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const deadline = `${deadlineDate}T${deadlineTime}`;
    
    if (!title || !deadlineDate || !deadlineTime || places.length === 0) {
      alert('투표 제목, 마감 날짜/시간, 그리고 하나 이상의 후보 장소를 등록해주세요.');
      return;
    }

    const now = new Date();
    const selectedDate = new Date(deadline);
    if (selectedDate <= now) {
      alert('투표 마감 일시는 현재 시간 이후로 설정해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          deadline, 
          options: places,
          allowMultipleVotes,
          allowAddOptions
        }),
      });

      const data = await response.json();
      if (response.ok && data.hashedId) {
        router.push(`/room/${data.hashedId}`);
      } else {
        alert(data.error || '투표 방 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFocusPlace = (item: KakaoPlace | MapPlace) => {
    const pId = 'placeId' in item ? item.placeId : (item as KakaoPlace).id;
    setIsAutoPanning(true);
    setFixedPlaceId(pId);
    setMapTargetCenter({ lat: Number(item.y), lng: Number(item.x) });
  };

  const handleMouseEnterPlace = (item: KakaoPlace | PlaceOption | MapPlace, shouldMoveMap: boolean = true) => {
    const pId = 'placeId' in item ? item.placeId : (item as KakaoPlace).id;
    setHoveredPlaceId(pId);
    
    if (fixedPlaceId && fixedPlaceId !== pId) {
      setFixedPlaceId(null);
    }
    
    if (shouldMoveMap) {
      setIsAutoPanning(true);
      if (baseCenter && !originalCenter) {
        setOriginalCenter(baseCenter);
      }
      setMapTargetCenter({ lat: Number(item.y), lng: Number(item.x) });
    } else {
      const cardElement = document.getElementById(`place-card-${pId}`) as HTMLElement | null;
      if (cardElement) {
        const container = cardElement.closest('.overflow-y-auto') as HTMLElement | null;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const cardRect = cardElement.getBoundingClientRect();
          if (cardRect.top < containerRect.top || cardRect.bottom > containerRect.bottom) {
            container.scrollTo({
              top: cardElement.offsetTop - container.offsetTop - 10,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  };

  const handleMouseLeavePlace = () => {
    setHoveredPlaceId(null);
    if (originalCenter) {
      setMapTargetCenter(originalCenter);
      setOriginalCenter(null);
    }
  };

  const isMapMoved = searchCenter && lastSearchCoord && (
    Math.abs(Number(searchCenter.x) - Number(lastSearchCoord.x)) > 0.0001 ||
    Math.abs(Number(searchCenter.y) - Number(lastSearchCoord.y)) > 0.0001
  );

  const showSearchNearby = (searchQuery.trim() !== '' || categoryFilter !== '') && isMapMoved && hoveredPlaceId === null && !isAutoPanning;

  return (
    <main className="min-h-screen bg-slate-50 pb-20 pt-10 px-6 text-slate-900 flex justify-center selection:bg-orange-500/30">
      <div className="fixed top-6 left-6 z-[100]">
        <button 
          onClick={() => router.back()}
          className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-orange-200 hover:bg-orange-50 transition-all shadow-sm hover:shadow-md group"
          title="이전 페이지로"
        >
          <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-0.5" />
        </button>
      </div>
      <div className="fixed top-6 right-6 z-[100]">
        <button 
          onClick={() => router.push('/')}
          className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-orange-200 hover:bg-orange-50 transition-all shadow-sm hover:shadow-md group"
          title="홈으로"
        >
          <Home className="w-6 h-6 transition-transform group-hover:scale-110" />
        </button>
      </div>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 20px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
      `}</style>
      <div className="w-full max-w-xl space-y-6">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">새로운 장소 투표</h1>
          <p className="text-slate-500">친구들에게 제안할 장소들을 골라주세요.</p>
        </div>

        <form onSubmit={handleCreateRoom} className="p-6 md:p-8 rounded-[2rem] bg-white border border-slate-200 shadow-2xl space-y-8">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 ml-1">이번 모임의 이름은?</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 이번주 금요일 강남 모임 🍻" 
              className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/10 transition-all text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => setAllowMultipleVotes(!allowMultipleVotes)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                allowMultipleVotes ? 'bg-orange-50 border-orange-300 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-sm font-bold">중복 투표 허용</p>
                <p className="text-[10px] opacity-70">한 사람이 여러 장소에 투표 가능</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                allowMultipleVotes ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
              }`}>
                {allowMultipleVotes && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
              </div>
            </div>

            <div 
              onClick={() => setAllowAddOptions(!allowAddOptions)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                allowAddOptions ? 'bg-rose-50 border-rose-300 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-sm font-bold">진행 중 장소 추가</p>
                <p className="text-[10px] opacity-70">참여자가 후보 직접 추가 가능</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                allowAddOptions ? 'border-rose-500 bg-rose-500' : 'border-slate-300'
              }`}>
                {allowAddOptions && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end ml-1">
              <label className="text-sm font-bold text-slate-700">투표 마감 일시 (이후엔 투표 종료)</label>
              {deadlineDate && deadlineTime && (
                <div className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 animate-in fade-in slide-in-from-right-1">
                  {(() => {
                    const now = new Date();
                    const deadline = new Date(`${deadlineDate}T${deadlineTime}`);
                    const diff = deadline.getTime() - now.getTime();
                    
                    if (diff <= 0) return '이미 마감되었습니다.';
                    
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    
                    return `${days > 0 ? `${days}일 ` : ''}${hours > 0 ? `${hours}시간 ` : ''}${mins}분 후 종료`;
                  })()}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-[2]">
                <input 
                  type="date" 
                  value={deadlineDate}
                  min={minDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-rose-400 focus:bg-white transition-all text-slate-900"
                />
              </div>
              <div className="flex-1">
                <input 
                  type="time" 
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-rose-400 focus:bg-white transition-all text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold text-slate-700">후보 장소 ({places.length}곳)</h3>
            </div>
            
            <div className="mb-4">
              <MapComponent 
                places={mapPlaces} 
                searchResults={mapSearchResults}
                onCenterChange={setSearchCenter}
                center={mapTargetCenter}
                hoveredPlaceId={hoveredPlaceId}
                onSearchNearby={showSearchNearby ? () => handleSearch(true) : undefined}
                onHoverEnter={(item) => handleMouseEnterPlace(item, false)}
                onHoverLeave={handleMouseLeavePlace}
                onClickPlace={handleFocusPlace}
                onAddPlace={(item) => {
                  const original = searchResults.find(s => s.id === item.placeId);
                  if (original) handleAddPlace(original);
                }}
              />
            </div>

            <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-bold text-slate-700">장소 찾기</label>
                </div>
                <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-none">
                  {[
                    { label: '전체', value: '' },
                    { label: '🍴 식당', value: 'FD6' },
                    { label: '☕ 카페', value: 'CE7' },
                    { label: '🏛️ 명소', value: 'AT4' },
                  ].map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategoryFilter(cat.value)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap border ${
                        categoryFilter === cat.value 
                          ? 'bg-orange-500 border-orange-400 text-white shadow-md' 
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch(true))}
                    placeholder="검색어 입력 (예: 강남역 맛집)" 
                    className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500 transition-all text-sm placeholder-slate-400" 
                  />
                  <button type="button" onClick={() => handleSearch(true)} disabled={isSearching} className="px-5 font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-all disabled:opacity-50 text-sm whitespace-nowrap shadow-sm active:scale-95">
                    {isSearching ? '중..' : '검색'}
                  </button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-[400px] overflow-y-auto space-y-4 px-4 py-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                  {searchResults.map((item) => {
                    const isSelected = places.some(p => p.placeId === item.id);
                    const isHovered = hoveredPlaceId === item.id;
                    const categoryClean = item.category_name.split(' > ').pop();
                    const mainCategory = item.category_group_name || item.category_name.split(' > ')[0];
                    return (
                      <div 
                        key={item.id} id={`place-card-${item.id}`}
                        onClick={() => handleFocusPlace(item)}
                        onMouseEnter={() => handleMouseEnterPlace(item)}
                        onMouseLeave={handleMouseLeavePlace}
                        className={`p-4 rounded-xl border transition-all duration-300 ${
                          isHovered 
                          ? 'border-orange-500 ring-2 ring-orange-100 bg-orange-50 shadow-md' 
                          : isSelected 
                            ? 'border-orange-200 bg-orange-50/50' 
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        } flex flex-col gap-3 group animate-in fade-in zoom-in-95 cursor-pointer`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex-1 min-w-0 py-0.5">
                              <div className="flex items-center flex-wrap gap-1.5 mb-1 text-sm"><h4 className="text-slate-900 font-bold truncate">{item.place_name}</h4>{isSelected && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-bold border border-orange-200">추가됨</span>}</div>
                              <div className="flex items-center flex-wrap gap-2 mb-1.5 text-[10px] font-bold"><span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-600 border border-orange-200">{mainCategory}</span><span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">{categoryClean}</span></div>
                              <p className="text-[11px] text-slate-500 truncate">{item.road_address_name || item.address_name}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => isSelected ? handleRemovePlace(item.id) : handleAddPlace(item)} className={`px-4 py-2 text-[12px] font-bold rounded-xl transition-all ${isSelected ? 'bg-slate-200 text-slate-500 cursor-default' : 'bg-orange-600 text-white hover:bg-orange-500 shadow-sm shadow-orange-200'}`}>{isSelected ? '제거' : '추가'}</button>
                            <a href={item.place_url} target="_blank" rel="noreferrer" className="px-4 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all text-center">상세보기</a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!isEnd && (
                    <div id="search-sentinel" className="py-8 flex justify-center items-center">
                      <div className="w-6 h-6 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-700 px-1 pt-4 border-t border-slate-100">선택된 후보 장소 ({places.length}곳)</h3>
              <div className="space-y-3">
                {places.length === 0 ? (
                  <div className="text-center py-10 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-slate-400 text-sm">아직 선택된 장소가 없습니다.</div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-3 px-4 py-1">
                    {places.map((place) => {
                      const isHovered = hoveredPlaceId === place.placeId;
                      return (
                        <div key={place.placeId} id={`place-card-${place.placeId}`} onMouseEnter={() => handleMouseEnterPlace(place)} onMouseLeave={handleMouseLeavePlace} className={`flex justify-between items-center p-4 rounded-xl border transition-all duration-300 ${isHovered ? 'border-orange-500 ring-2 ring-orange-100 bg-orange-50 shadow-md' : 'border-slate-200 bg-slate-50'} group`}>
                          <div className="flex flex-col"><span className="font-bold text-slate-900">{place.name}</span><span className="text-xs text-slate-500 mt-1">{place.category.split(' > ').pop()} · {place.address}</span></div>
                          <button type="button" onClick={() => handleRemovePlace(place.placeId)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting || places.length === 0 || !title || !deadlineDate || !deadlineTime} className={`w-full py-5 rounded-2xl font-bold text-lg transition-all duration-500 active:scale-[0.98] ${(isSubmitting || places.length === 0 || !title || !deadlineDate || !deadlineTime) ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-[0_0_30px_-5px_rgba(244,63,94,0.4)] hover:shadow-[0_0_40px_-5px_rgba(244,63,94,0.6)] cursor-pointer'}`}>
              {isSubmitting ? '방 생성 중...' : '투표 만들기'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
