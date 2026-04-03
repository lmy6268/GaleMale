'use client';

import { Map, useKakaoLoader, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { useEffect, useState, useRef } from 'react';

export interface MapPlace {
  placeId: string;
  name: string;
  x: string; // 경도 (longitude)
  y: string; // 위도 (latitude)
}

interface MapComponentProps {
  places: MapPlace[];
  searchResults?: MapPlace[];
  hoveredPlaceId?: string | null;
  center?: { lat: number; lng: number };
  onCenterChange?: (center: { x: string; y: string }) => void;
  onSearchNearby?: () => void;
  onHoverEnter?: (place: MapPlace) => void;
  onHoverLeave?: () => void;
  onClickPlace?: (place: MapPlace) => void;
  onAddPlace?: (place: MapPlace) => void;
  votedPlaceIds?: string[];
}

export default function MapComponent({ 
  places, 
  searchResults = [], 
  hoveredPlaceId, 
  center: externalCenter, 
  onCenterChange, 
  onSearchNearby,
  onHoverEnter,
  onHoverLeave,
  onClickPlace,
  onAddPlace,
  votedPlaceIds = []
}: MapComponentProps) {
  // layout.tsx에서 이미 스크립트를 로드했지만, 컴포넌트 레벨에서 로딩 상태를 확인하기 위해 사용
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || '', 
    libraries: ['services', 'clusterer'],
  });

  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [isInitialCentered, setIsInitialCentered] = useState(false);
  const [clickedPlaceId, setClickedPlaceId] = useState<string | null>(null);

  const externalLat = externalCenter?.lat;
  const externalLng = externalCenter?.lng;

  // 실시간 GPS 위치 추적
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setMyPos(newPos);
        
        // [결단] 투표방에서는 사용자의 GPS 위치로 지도를 '자동 이동' 시키지 않습니다.
        // 지도는 항상 후보지(externalLat) 혹은 1번 장소를 우선해서 보여주며,
        // 내 위치는 우측 하단의 '내 위치 버튼'을 눌렀을 때만 명시적으로 이동합니다.
        if (!isInitialCentered && map) {
          setIsInitialCentered(true);
        }
      },
      (err) => console.error('GPS Watch Error:', err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, isInitialCentered, externalLat, externalLng]);

  // 외부(부모)에서 명시적으로 좌표가 내려오면 해당 위치로 지도 이동 (시각화 연동)
  useEffect(() => {
    if (externalLat && externalLng && map) {
      const currentCenter = map.getCenter();
      // 현재 중심과 목표 중심이 충분히 다를 때만 이동
      if (Math.abs(currentCenter.getLat() - externalLat) > 0.00001 || Math.abs(currentCenter.getLng() - externalLng) > 0.00001) {
        const moveLatLng = new window.kakao.maps.LatLng(externalLat, externalLng);
        map.panTo(moveLatLng);
      }
    }
  }, [externalLat, externalLng, map]);

  const handleCenterChange = () => {
    if (!map || !onCenterChange) return;
    const center = map.getCenter();
    const lat = center.getLat();
    const lng = center.getLng();

    // 부모에게 현재 중심 좌표 보고 (전체 보고로 상태 해제 보장)
    onCenterChange({
      x: lng.toString(),
      y: lat.toString(),
    });
  };

  const moveToMyLocation = () => {
    if (!map || !myPos) return;
    const locPosition = new kakao.maps.LatLng(myPos.lat, myPos.lng);
    map.panTo(locPosition);
  };

  useEffect(() => {
    if (error) console.error('Kakao Map Load Error:', error);
  }, [error]);

  // 최초 1회만 모든 후보지가 한눈에 들어오도록 지도의 영역(Bounds) 설정
  const isBoundsInitialSet = useRef(false);

  useEffect(() => {
    if (!map || places.length === 0 || isBoundsInitialSet.current) return;

    // 후보지들이 모두 포함되도록 영역 계산
    const bounds = new window.kakao.maps.LatLngBounds();
    places.forEach(p => {
      bounds.extend(new window.kakao.maps.LatLng(Number(p.y), Number(p.x)));
    });

    // 지도가 충분히 준비된 후 영역 맞춤 (약간의 여백 포함)
    map.setBounds(bounds, 80); // 80px 여백
    isBoundsInitialSet.current = true;
    
    // 이펙트 내 동기적 상태 업데이트 대신 비동기적(setTimeout)으로 처리하여 린트 경고 해결
    setTimeout(() => {
      setIsInitialCentered(true);
    }, 0);
  }, [map, places]);

  // 이전에 setBounds를 실행했던 장소들의 ID를 저장 (REF 사용하여 무한 루프/리렌더링 방지)
  const lastBoundsPlacesRef = useRef("");

  useEffect(() => {
    if (!map || places.length === 0) return;

    // 장소 리스트가 실제로 변했는지 확인 (ID 조합으로 비교)
    const currentPlacesStr = places.map(p => p.placeId).sort().join(",");
    if (currentPlacesStr === lastBoundsPlacesRef.current) return;
    
    lastBoundsPlacesRef.current = currentPlacesStr;
  }, [map, places]);

  if (loading) {
    return (
      <div className="w-full h-[300px] md:h-[400px] rounded-2xl bg-slate-900/50 flex items-center justify-center border border-white/5 animate-pulse">
        <span className="text-slate-500 font-medium">지도를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[300px] md:h-[400px] rounded-2xl bg-slate-900/50 flex flex-col items-center justify-center border border-rose-500/20 text-center p-4">
        <span className="text-rose-400 font-bold mb-2">지도 로드 실패</span>
        <span className="text-slate-500 text-xs">{error.message}</span>
        <div className="text-slate-600 text-[10px] mt-4 space-y-1">
          <p>1. 카카오 개발자 콘솔 &gt; 플랫폼</p>
          <p>2. JavaScript 키 확인</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden border border-white/10 shadow-inner group relative">
      {/* 내 위치 버튼 - 사용자 요청의 화이트 조준경 스타일 적용 */}
      <div className="absolute bottom-4 right-4 z-[20] pointer-events-auto">
        <button 
          type="button"
          onClick={moveToMyLocation}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-xl flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all group"
          title="내 위치로 이동"
        >
          <svg 
            className="w-6 h-6 text-blue-600 fill-none stroke-current" 
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
            <circle cx="12" cy="12" r="2"></circle>
          </svg>
        </button>
      </div>

      <div className="absolute inset-x-0 top-4 z-20 flex flex-col items-center gap-2 pointer-events-none px-4">
        {/* 이 지역 재검색 버튼 (불투명 흰색 - 안정감 강화) */}
        {onSearchNearby && (
          <button 
            type="button"
            onClick={onSearchNearby}
            className="pointer-events-auto px-5 py-2.5 bg-white border-2 border-orange-500 text-orange-600 text-[11px] md:text-xs font-extrabold rounded-full shadow-xl hover:bg-orange-50 transition-all active:scale-95 animate-in fade-in slide-in-from-top-2 flex items-center gap-1.5"
          >
            <span className="text-orange-500">📍</span> 이 지역에서 재검색
          </button>
        )}
      </div>

      <Map
        center={externalCenter || { lat: 37.5665, lng: 126.9780 }}
        style={{ width: '100%', height: '100%' }}
        onCreate={setMap}
        onIdle={handleCenterChange}
      >
        {/* 실제 GPS 내 위치 마커 (파란색 포인트) */}
        {myPos && (
          <CustomOverlayMap position={myPos}>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
              <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
            </div>
          </CustomOverlayMap>
        )}

        {/* 검색 결과 마커 (연한 주황색 - 보조적인 느낌) */}
        {searchResults.map((item) => {
          const isSelected = places.some(p => p.placeId === item.placeId);
          if (isSelected) return null;
          const isHovered = hoveredPlaceId === item.placeId;
          const isClicked = clickedPlaceId === item.placeId;
          
          return (
            <div 
              key={`search-group-${item.placeId}`} 
              onMouseEnter={() => onHoverEnter?.(item)}
              onMouseLeave={() => onHoverLeave?.()}
              onClick={() => {
                setClickedPlaceId(isClicked ? null : item.placeId);
                onClickPlace?.(item);
              }}
              className="group cursor-pointer"
            >
              <CustomOverlayMap position={{ lat: Number(item.y), lng: Number(item.x) }}>
                <div className={`relative flex flex-col items-center transition-all duration-300 ${isHovered || isClicked ? 'scale-110 -translate-y-0.5' : 'scale-90 opacity-100'}`}>
                  {/* 원래의 주황색 마커 스타일 */}
                  <svg width="26" height="32" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
                    <path d="M17 0C7.61116 0 0 7.61116 0 17C0 27.502 14.5447 40.5055 16.1477 41.687C16.4253 41.8906 16.7577 42 17 42C17.2423 42 17.5747 41.8906 17.8523 41.687C19.4553 40.5055 34 27.502 34 17C34 7.61116 26.3888 0 17 0Z" fill={isClicked ? "#F97316" : "#FDBA74"}/>
                    <circle cx="17" cy="17" r="7" fill="white" fillOpacity="1"/>
                  </svg>
                  <div className="w-1 h-1"></div>
                </div>
              </CustomOverlayMap>

              {(isHovered || isClicked) && (
                <CustomOverlayMap 
                  position={{ lat: Number(item.y), lng: Number(item.x) }} 
                  yAnchor={1.6}
                  zIndex={100}
                >
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="px-3 py-2 bg-orange-500 backdrop-blur-none border border-white/30 rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center gap-1.5"
                  >
                    <span className="text-white text-[11px] font-bold whitespace-nowrap">{item.name}</span>
                    {onAddPlace && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddPlace(item);
                          setClickedPlaceId(null);
                        }}
                        className="w-full py-1 bg-white/20 hover:bg-white/30 text-white text-[10px] font-extrabold rounded-md transition-all active:scale-95 flex items-center justify-center gap-1"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                        후보 추가
                      </button>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-orange-500"></div>
                  </div>
                </CustomOverlayMap>
              )}
            </div>
          );
        })}

        {/* 확정 후보 마커 (진한 Rose 컬러 + 강한 강조) */}
        {places.map((place) => {
          const isHovered = hoveredPlaceId === place.placeId;
          const isVoted = votedPlaceIds.includes(place.placeId);
          
          return (
            <div 
              key={`place-group-${place.placeId}`} 
              onMouseEnter={() => onHoverEnter?.(place)}
              onMouseLeave={() => onHoverLeave?.()}
              onClick={() => onClickPlace?.(place)}
              className="group cursor-pointer"
            >
              <CustomOverlayMap position={{ lat: Number(place.y), lng: Number(place.x) }}>
                <div className={`relative flex flex-col items-center transition-all duration-300 ${isHovered ? 'scale-125 -translate-y-1' : 'scale-100'}`}>
                  {/* 선택된 경우 초록색, 미선택 시 주황색 적용 */}
                  <svg 
                    width="28" 
                    height="34" 
                    viewBox="0 0 34 42" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`drop-shadow-sm ${isVoted ? 'drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]' : 'drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]'}`}
                  >
                    <path 
                      d="M17 0C7.61116 0 0 7.61116 0 17C0 27.502 14.5447 40.5055 16.1477 41.687C16.4253 41.8906 16.7577 42 17 42C17.2423 42 17.5747 41.8906 17.8523 41.687C19.4553 40.5055 34 27.502 34 17C34 7.61116 26.3888 0 17 0Z" 
                      fill={isVoted ? "#10B981" : "#F97316"}
                    />
                    {isVoted ? (
                      <path d="M11 18.5L15 22.5L23 14.5" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                    ) : (
                      <path d="M17 11L18.8541 14.7578L23 15.3647L20 18.2853L20.7082 22.4102L17 20.4611L13.2918 22.4102L14 18.2853L11 15.3647L15.1459 14.7578L17 11Z" fill="white"/>
                    )}
                  </svg>
                  <div className="w-1 h-1"></div>
                </div>
              </CustomOverlayMap>
              
              <CustomOverlayMap position={{ lat: Number(place.y), lng: Number(place.x) }} yAnchor={1.6}>
                <div className={`px-3 py-1.5 ${isVoted ? 'bg-emerald-600' : 'bg-orange-500'} backdrop-blur-none border border-white/30 rounded-lg shadow-2xl transition-all duration-200 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                  <span className="text-white text-[11px] font-bold whitespace-nowrap">{place.name}</span>
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] ${isVoted ? 'border-t-emerald-600' : 'border-t-orange-500'}`}></div>
                </div>
              </CustomOverlayMap>
            </div>
          );
        })}
      </Map>
    </div>
  );
}
