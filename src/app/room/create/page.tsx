'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  
  // 방 설정 옵션
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
  const [categoryFilter, setCategoryFilter] = useState<string>(''); // FD6, CE7, AT4 등
  const [page, setPage] = useState(1);
  const [isEnd, setIsEnd] = useState(true);
  const [originalCenter, setOriginalCenter] = useState<{ lat: number; lng: number } | null>(null);
  
  const [fixedPlaceId, setFixedPlaceId] = useState<string | null>(null);
  const [isAutoPanning, setIsAutoPanning] = useState(false);
  const [baseCenter, setBaseCenter] = useState<{ lat: number; lng: number } | null>(null);

  // MapComponent에 전달할 후보 장소들 메모이제이션 (무한 루프 방지)
  const mapPlaces = useMemo(() => 
    places.map(p => ({ placeId: p.placeId, name: p.name, x: p.x, y: p.y })),
    [places]
  );

  // MapComponent에 전달할 검색 결과들 메모이제이션
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
    // 기본 마감 시간을 현재로부터 12시간 후로 설정 (사용자 피드백 반영)
    const now = new Date();
    const defaultDeadline = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    
    const dateStr = defaultDeadline.toISOString().split('T')[0];
    const timeStr = defaultDeadline.toTimeString().slice(0, 5);
    
    setDeadlineDate(dateStr);
    setDeadlineTime(timeStr);
    
    // minDate는 오늘로 유지
    const todayStr = now.toISOString().split('T')[0];
    setMinDate(todayStr);
  }, []);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // 검색어 디바운싱
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
  }, [categoryFilter, debouncedSearchQuery]); // handleSearch 제외하여 지도 이동에 따른 자동 검색 방지

  const observerRef = useRef<IntersectionObserver | null>(null);

  // 무한 스크롤 Observer 설정
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

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') router.replace('/');
    return null;
  }

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

  const handleRemovePlace = (placeId: string) => {
    setPlaces(places.filter(p => p.placeId !== placeId));
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
    setTimeout(() => {
      setHoveredPlaceId(prev => {
        if (prev === null) {
          setFixedPlaceId(fixed => {
            if (fixed === null && originalCenter) {
              setIsAutoPanning(true);
              setMapTargetCenter(originalCenter);
              setOriginalCenter(null);
            }
            return fixed;
          });
        }
        return prev;
      });
    }, 50);
  };

  const isMapMoved = searchCenter && lastSearchCoord && (
    Math.abs(Number(searchCenter.x) - Number(lastSearchCoord.x)) > 0.0001 ||
    Math.abs(Number(searchCenter.y) - Number(lastSearchCoord.y)) > 0.0001
  );

  const showSearchNearby = (searchQuery.trim() !== '' || categoryFilter !== '') && isMapMoved && hoveredPlaceId === null && !isAutoPanning;

  return (
    <main className="min-h-screen bg-slate-950 pb-20 pt-10 px-6 text-slate-100 flex justify-center">
      <style jsx global>{`
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.4); border-radius: 20px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 0.6); }
      `}</style>
      <div className="w-full max-w-xl space-y-6">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-white mb-2">프라이빗 투표 방 생성</h1>
          <p className="text-slate-400">친구들에게 제안할 장소들을 골라주세요.</p>
        </div>

        <form onSubmit={handleCreateRoom} className="p-6 md:p-8 rounded-[2rem] bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl space-y-8">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300 ml-1">이번 모임의 이름은?</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 이번주 금요일 강남 모임 🍻" 
              className="w-full px-5 py-4 rounded-xl bg-slate-800/50 border border-slate-700/50 outline-none focus:border-orange-500 focus:bg-slate-800 transition-colors text-white placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => setAllowMultipleVotes(!allowMultipleVotes)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                allowMultipleVotes ? 'bg-orange-500/10 border-orange-500/40 text-orange-400' : 'bg-slate-800/20 border-white/5 text-slate-500 hover:border-white/10'
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-sm font-bold">중복 투표 허용</p>
                <p className="text-[10px] opacity-70">한 사람이 여러 장소에 투표 가능</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                allowMultipleVotes ? 'border-orange-500 bg-orange-500' : 'border-slate-700'
              }`}>
                {allowMultipleVotes && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
              </div>
            </div>

            <div 
              onClick={() => setAllowAddOptions(!allowAddOptions)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                allowAddOptions ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' : 'bg-slate-800/20 border-white/5 text-slate-500 hover:border-white/10'
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-sm font-bold">진행 중 장소 추가</p>
                <p className="text-[10px] opacity-70">투표 중에도 참여자가 후보 추가 가능</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                allowAddOptions ? 'border-rose-500 bg-rose-500' : 'border-slate-700'
              }`}>
                {allowAddOptions && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end ml-1">
              <label className="text-sm font-semibold text-slate-300">투표 마감 일시 (이 시간이 지나면 투표 종료)</label>
              {deadlineDate && deadlineTime && (
                <div className="text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 animate-in fade-in slide-in-from-right-1">
                  {(() => {
                    const now = new Date();
                    const deadline = new Date(`${deadlineDate}T${deadlineTime}`);
                    const diff = deadline.getTime() - now.getTime();
                    
                    if (diff <= 0) return '이미 마감되었거나 설정이 잘못되었습니다.';
                    
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    
                    return `${days > 0 ? `${days}일 ` : ''}${hours > 0 ? `${hours}시간 ` : ''}${mins}분 후 투표 종료`;
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
                  className="w-full px-5 py-4 rounded-xl bg-slate-800/50 border border-slate-700/50 outline-none focus:border-rose-500 focus:bg-slate-800 transition-colors text-white [color-scheme:dark]"
                />
              </div>
              <div className="flex-1">
                <input 
                  type="time" 
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl bg-slate-800/50 border border-slate-700/50 outline-none focus:border-rose-500 focus:bg-slate-800 transition-colors text-white [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-semibold text-slate-300">후보 장소 ({places.length}곳)</h3>
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
              />
            </div>

            {/* 통합형 검색 섹션 */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-800/40 border border-white/5">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-semibold text-slate-300">장소 찾기</label>
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
                          ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-900/20' 
                          : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
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
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700/50 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm" 
                  />
                  <button type="button" onClick={() => handleSearch(true)} disabled={isSearching} className="px-5 font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-colors disabled:opacity-50 text-sm whitespace-nowrap">
                    {isSearching ? '중..' : '검색'}
                  </button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-[400px] overflow-y-auto space-y-4 px-4 py-2 scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent hover:scrollbar-thumb-slate-600 transition-all">
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
                          ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-500/10 shadow-lg shadow-orange-900/20' 
                          : isSelected 
                            ? 'border-orange-500/60 bg-orange-500/10' 
                            : 'border-slate-800/60 hover:border-slate-700 bg-slate-800/20'
                        } flex flex-col gap-3 group animate-in fade-in zoom-in-95 cursor-pointer`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex-1 min-w-0 py-0.5">
                              <div className="flex items-center flex-wrap gap-1.5 mb-1 text-sm"><h4 className="text-white font-bold truncate">{item.place_name}</h4>{isSelected && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-md font-bold border border-orange-500/20">추가됨</span>}</div>
                              <div className="flex items-center flex-wrap gap-2 mb-1.5 text-[10px] font-bold"><span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">{mainCategory}</span><span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/5">{categoryClean}</span></div>
                              <p className="text-[11px] text-slate-400 truncate">{item.road_address_name || item.address_name}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => isSelected ? setPlaces(places.filter(p => p.placeId !== item.id)) : setPlaces([...places, { placeId: item.id, name: item.place_name, address: item.road_address_name || item.address_name, category: item.category_name, placeUrl: item.place_url, x: item.x, y: item.y, imageUrl: item.imageUrl }])} className={`px-4 py-2 text-[12px] font-bold rounded-xl transition-all shadow-lg ${isSelected ? 'bg-slate-700 text-slate-400' : 'bg-orange-600 text-white hover:bg-orange-500 shadow-orange-900/20'}`}>{isSelected ? '제거' : '추가'}</button>
                            <a href={item.place_url} target="_blank" rel="noreferrer" className="px-4 py-2 text-[11px] font-bold text-slate-400 hover:text-white bg-slate-900/50 border border-white/10 rounded-xl hover:bg-slate-800 transition-all text-center">상세보기</a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* 무한 스크롤 관찰용 sentinel */}
                  {!isEnd && (
                    <div id="search-sentinel" className="py-8 flex justify-center items-center">
                      <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 px-1 pt-4 border-t border-slate-800">선택된 후보 장소 ({places.length}곳)</h3>
              <div className="space-y-3">
                {places.length === 0 ? (
                  <div className="text-center py-10 rounded-2xl bg-slate-800/20 border border-dashed border-slate-700 text-slate-500 text-sm">아직 선택된 장소가 없습니다. 위에서 장소를 검색해 추가해 주세요.</div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-3 px-4 py-1">
                    {places.map((place) => {
                      const isHovered = hoveredPlaceId === place.placeId;
                      return (
                        <div key={place.placeId} id={`place-card-${place.placeId}`} onMouseEnter={() => handleMouseEnterPlace(place)} onMouseLeave={handleMouseLeavePlace} className={`flex justify-between items-center p-4 rounded-xl border transition-all duration-300 ${isHovered ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-500/10 shadow-lg shadow-orange-900/20' : 'border-slate-700/50 bg-slate-800/50'} group`}>
                          <div className="flex flex-col"><span className="font-bold text-slate-100">{place.name}</span><span className="text-xs text-slate-400 mt-1">{place.category.split(' > ').pop()} · {place.address}</span></div>
                          <button type="button" onClick={() => handleRemovePlace(place.placeId)} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
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
