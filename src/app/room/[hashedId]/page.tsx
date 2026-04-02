'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import MapComponent, { MapPlace } from '@/components/MapComponent';
import Link from 'next/link';

interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  road_address_name?: string;
  address_name: string;
  place_url: string;
  x: string;
  y: string;
  imageUrl?: string;
}

interface PlaceOption {
  placeId: string;
  name: string;
  address: string;
  category: string;
  placeUrl?: string;
  x: string;
  y: string;
  imageUrl?: string;
  voteCount: number;
}

interface RoomData {
  _id: string;
  hashedId: string;
  title: string;
  deadline: string;
  isClosed: boolean;
  allowMultipleVotes: boolean;
  allowAddOptions: boolean;
  options: PlaceOption[];
  creatorUserId: string;
  participantCount?: number;
}

export default function RoomPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const hashedId = params.hashedId as string;

  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [votedPlaceIds, setVotedPlaceIds] = useState<string[]>([]);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [isVoting, setIsVoting] = useState(false);
  
  const [mapTargetCenter, setMapTargetCenter] = useState<{ lat: number, lng: number } | undefined>(undefined);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [newDeadlineTime, setNewDeadlineTime] = useState('');
  
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchRoomData = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${hashedId}`);
      const data = await res.json();
      if (res.ok) setRoom(data);
      else setError(data.error || '방 정보를 불러오지 못했습니다.');
    } catch (err) {
      console.error('Fetch room error:', err);
      setError('서버 연결 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [hashedId]);

  const fetchVoteStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${hashedId}/vote`);
      const data = await res.json();
      if (res.ok && data.hasVoted) {
        const ids = Array.isArray(data.selectedPlaceIds) ? data.selectedPlaceIds : [data.selectedPlaceId];
        setVotedPlaceIds(ids);
        setTempSelectedIds(ids);
      } else {
        setVotedPlaceIds([]);
        setTempSelectedIds([]);
      }
    } catch (err) {
      console.error('Vote status fetch error:', err);
    }
  }, [hashedId]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRoomData();
      fetchVoteStatus();
    }
  }, [status, fetchRoomData, fetchVoteStatus]);

  const toggleSelection = (placeId: string) => {
    if (isClosed) return;

    setTempSelectedIds((prev) => {
      const isAlreadySelected = prev.includes(placeId);

      // 단일 투표 모드 (!allowMultipleVotes)
      if (!room?.allowMultipleVotes) {
        // 이미 선택된 걸 다시 클릭해도 제거하지 않음 (단순 고정)
        return [placeId];
      }

      // 중복 투표 모드 (allowMultipleVotes)
      if (isAlreadySelected) {
        // 이미 선택된 경우 제거 (토글)
        return prev.filter(id => id !== placeId);
      }
      // 새로 선택하는 경우 추가
      return [...prev, placeId];
    });
  };

  const handleSaveVote = async () => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      const res = await fetch(`/api/room/${hashedId}/vote`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeIds: tempSelectedIds }),
      });
      if (res.ok) {
        setVotedPlaceIds(tempSelectedIds);
        fetchRoomData();
      } else {
        const data = await res.json();
        alert(data.error || '저장 실패');
      }
    } catch (err) {
      console.error('Vote save error:', err);
      alert('서버 오류');
    } finally {
      setIsVoting(false);
    }
  };

  const handleUpdateRoom = async (fields: Partial<RoomData>) => {
    try {
      const res = await fetch(`/api/room/${hashedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        setRoom(prev => prev ? { ...prev, ...fields } : null);
        setIsEditingTitle(false);
        setIsEditingDeadline(false);
        setIsAddingOption(false);
      } else {
        const data = await res.json();
        alert(data.error || '수정 실패');
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('서버 오류');
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('정말로 이 투표 방을 삭제하시겠습니까? 모든 데이터가 사라집니다.')) return;
    try {
      const res = await fetch(`/api/room/${hashedId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('방이 삭제되었습니다.');
        router.push('/');
      } else {
        const data = await res.json();
        alert(data.error || '삭제 실패');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('오류 발생');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddOption = async (item: KakaoPlace) => {
    if (room?.options.some(o => o.placeId === item.id)) {
      alert('이미 후보에 있는 장소입니다.');
      return;
    }

    const newOption: PlaceOption = {
      placeId: item.id,
      name: item.place_name,
      address: item.road_address_name || item.address_name,
      category: item.category_name,
      placeUrl: item.place_url,
      x: item.x,
      y: item.y,
      imageUrl: item.imageUrl,
      voteCount: 0
    };

    const updatedOptions: PlaceOption[] = [...(room?.options || []), newOption];
    await handleUpdateRoom({ options: updatedOptions });
    setIsAddingOption(false);
  };

  const isDeadlinePassed = room ? new Date(room.deadline) < new Date() : false;
  const isClosed = room?.isClosed || isDeadlinePassed;
  const sessionUser = session?.user as { id?: string, email?: string } | undefined;
  const isCreator = sessionUser && (
    (sessionUser.id && sessionUser.id === room?.creatorUserId) || 
    (sessionUser.email && sessionUser.email === room?.creatorUserId)
  );

  const mapSearchResults: MapPlace[] = searchResults.map(item => ({
    placeId: item.id,
    name: item.place_name,
    x: item.x,
    y: item.y
  }));

  const isModified = JSON.stringify([...tempSelectedIds].sort()) !== JSON.stringify([...votedPlaceIds].sort());

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin"></div>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">로그인이 필요합니다.</h1>
        <p className="text-slate-400 mb-8">안전한 투표 진행을 위해 카카오 로그인을 먼저 진행해주세요.</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 rounded-xl bg-[#FEE500] text-black font-bold">홈으로 돌아가기</button>
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">오류 발생</h1>
        <p className="text-slate-400 mb-8">{error || '방을 찾을 수 없습니다.'}</p>
        <Link href="/" className="px-6 py-3 rounded-xl bg-slate-800 text-white font-bold">홈으로</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-32 pt-10 px-6 text-slate-100 flex justify-center selection:bg-orange-500/30">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* 헤더 */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-black tracking-widest uppercase border border-orange-500/20">
            <span className="relative flex h-2 w-2">
              <span className={`${!isClosed ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${!isClosed ? 'bg-orange-500' : 'bg-slate-500'}`}></span>
            </span>
            {isClosed ? '투표 종료됨' : '실시간 투표 진행 중'}
          </div>

          
          <div className="flex flex-col items-center gap-2">
            {isEditingTitle ? (
              <div className="flex w-full max-w-sm gap-2">
                <input 
                  autoFocus
                  className="flex-1 bg-slate-900 border border-orange-500/50 rounded-xl px-4 py-2 text-xl font-bold outline-none"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <button onClick={() => handleUpdateRoom({ title: newTitle })} className="bg-orange-500 text-white px-4 rounded-xl font-bold text-sm">저장</button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-tight">{room.title}</h1>
                {isCreator && (
                  <button onClick={() => { setNewTitle(room.title); setIsEditingTitle(true); }} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/5 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/50 text-slate-400 border border-white/5">
              <svg className="w-3.5 h-3.5 text-orange-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              현재 <span className="text-white font-bold">{room.participantCount || 0}명</span> 참여
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/50 text-slate-400 border border-white/5">
              <svg className="w-3.5 h-3.5 text-blue-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              마감: {new Date(room.deadline).toLocaleDateString('ko-KR')} 일시
            </div>
            {isCreator && !isClosed && (
              <button onClick={() => setIsEditingDeadline(!isEditingDeadline)} className="p-1 px-2 rounded-lg text-slate-500 hover:text-orange-400 hover:bg-orange-500/5 transition-all text-[10px] font-bold">
                시간 변경
              </button>
            )}
            
            {isCreator && (
              <div className="flex gap-2 ml-1 border-l border-white/10 pl-3">
                {!isClosed ? (
                  <button onClick={() => handleUpdateRoom({ isClosed: true })} className="p-1 px-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all text-[10px] font-bold">강제 마감</button>
                ) : (
                  <button onClick={() => handleUpdateRoom({ isClosed: false })} className="p-1 px-2 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all text-[10px] font-bold">다시 열기</button>
                )}
                <button onClick={handleDeleteRoom} className="p-1 px-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all text-[10px] font-bold">투표 삭제</button>
              </div>
            )}
            {isClosed && <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase">마감 완료</span>}
          </div>
          
          {isEditingDeadline && (
            <div className="max-w-sm mx-auto p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2">
               <div className="flex flex-col sm:flex-row gap-2">
                 <input type="date" value={newDeadlineDate} onChange={(e) => setNewDeadlineDate(e.target.value)} className="flex-[2] bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-sm outline-none" />
                 <input type="time" value={newDeadlineTime} onChange={(e) => setNewDeadlineTime(e.target.value)} className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-sm outline-none" />
               </div>
               <button 
                onClick={() => handleUpdateRoom({ deadline: new Date(`${newDeadlineDate}T${newDeadlineTime}`).toISOString() })}
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all"
               >
                 마감 기한 변경
               </button>
            </div>
          )}
        </div>

        {/* 지도 */}
        <div className="space-y-3">
          <MapComponent 
            places={room.options} 
            searchResults={mapSearchResults}
            hoveredPlaceId={hoveredPlaceId}
            votedPlaceIds={tempSelectedIds}
            center={mapTargetCenter || (room.options.length > 0 ? { lat: Number(room.options[0].y), lng: Number(room.options[0].x) } : undefined)}
            onHoverEnter={(place) => setHoveredPlaceId(place.placeId)}
            onHoverLeave={() => setHoveredPlaceId(null)}
            onClickPlace={(place) => {
              const original = searchResults.find(s => s.id === place.placeId);
              if (original) handleAddOption(original);
            }}
          />

        </div>

        {/* 투표 리스트 */}
        <div className="space-y-5 pt-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-black text-white">어디가 좋을까요?</h3>
            {room.allowAddOptions && (
              <button 
                onClick={() => setIsAddingOption(!isAddingOption)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all shadow-lg ${
                  isAddingOption 
                    ? 'bg-slate-800 text-slate-300' 
                    : 'bg-orange-500 text-white hover:scale-105 active:scale-95'
                }`}
              >
                {isAddingOption ? '취소' : <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                  장소 추천하기
                </>}
              </button>
            )}
          </div>

          {isAddingOption && (
            <div className="p-6 rounded-[2.5rem] bg-slate-900 border border-orange-500/30 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl shadow-orange-950/20">
              <div className="flex gap-2">
                <input 
                  autoFocus
                  className="flex-1 bg-slate-950 border border-white/10 rounded-2xl px-5 py-3 outline-none focus:border-orange-500/50 text-sm"
                  placeholder="장소 이름이나 주소를 입력하세요"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} disabled={isSearching} className="bg-orange-600 hover:bg-orange-500 text-white px-6 rounded-2xl font-bold">
                  {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '검색'}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="grid gap-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  {searchResults.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => handleAddOption(item)}
                      onMouseEnter={() => {
                        setHoveredPlaceId(item.id);
                        setMapTargetCenter({ lat: Number(item.y), lng: Number(item.x) });
                      }}
                      onMouseLeave={() => {
                        setHoveredPlaceId(null);
                        setMapTargetCenter(undefined);
                      }}
                      className="p-4 rounded-2xl bg-slate-950 border border-white/5 hover:border-orange-500/30 transition-all flex justify-between items-center group cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="min-w-0 py-0.5">
                          <h4 className="text-sm font-bold text-white truncate group-hover:text-orange-400 transition-colors">{item.place_name}</h4>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.road_address_name || item.address_name}</p>
                        </div>
                      </div>
                      <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition-all text-sm font-bold">추가</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="grid gap-4">
            {room.options.map((option) => {
              const isActive = tempSelectedIds.includes(option.placeId);
              const isActuallyVoted = votedPlaceIds.includes(option.placeId);
              const totalVotes = room.options.reduce((a, b) => a + b.voteCount, 0) || 1;

              return (
                <div 
                  key={option.placeId}
                  onMouseEnter={() => {
                    setHoveredPlaceId(option.placeId);
                    setMapTargetCenter({ lat: Number(option.y), lng: Number(option.x) });
                  }}
                  onMouseLeave={() => {
                    setHoveredPlaceId(null);
                    setMapTargetCenter(undefined);
                  }}
                  onClick={() => toggleSelection(option.placeId)}
                  className={`p-6 rounded-[2.5rem] border transition-all duration-300 cursor-pointer group ${
                    isActive 
                      ? 'bg-emerald-500/10 border-emerald-500/60 shadow-[0_0_40px_-15px_rgba(16,185,129,0.3)] scale-[1.02]' 
                      : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:translate-x-1'
                  }`}
                >
                  <div className="flex justify-between items-start gap-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-extrabold text-xl text-white tracking-tight group-hover:text-orange-400 transition-colors uppercase">{option.name}</span>
                        {option.placeUrl && <a href={option.placeUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>}
                      </div>
                      <p className="text-[12px] text-slate-500 mb-4 truncate">{option.address}</p>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-black text-orange-500">{option.voteCount}<span className="text-[10px] text-slate-600 font-bold ml-1">표</span></div>
                        <div className="h-1.5 flex-1 bg-slate-800/50 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-500 to-rose-500" style={{ width: `${(option.voteCount / totalVotes) * 100}%` }}></div>
                        </div>
                        {isActuallyVoted && <div className="text-[10px] font-black text-emerald-500 animate-pulse">MY VOTE</div>}
                      </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-white/10 bg-slate-900'}`}>
                      {isActive && <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 푸터 */}
        <div className="pt-12 flex flex-col gap-4 border-t border-white/5">
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('복사되었습니다!'); }} className="w-full py-5 rounded-[2rem] border border-white/5 bg-slate-900/40 text-slate-500 font-black text-sm hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95">초대 링크 복사하기</button>
          <Link href="/" className="text-center text-slate-700 text-xs font-bold hover:text-slate-400 transition-all tracking-widest uppercase">홈으로 돌아가기</Link>
        </div>

        {/* 플로팅 바 */}
        {isModified && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-lg z-[100] animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-4 rounded-[2.5rem] bg-white/95 backdrop-blur-xl shadow-2xl border border-white flex items-center justify-between gap-4">
              <div className="pl-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">장소 선택됨</p>
                <p className="text-lg font-black text-slate-900 leading-none">{tempSelectedIds.length}개 후보</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setTempSelectedIds(votedPlaceIds)} className="px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm">취소</button>
                <button onClick={handleSaveVote} disabled={isVoting} className="px-8 py-4 rounded-2xl bg-slate-950 text-white font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 tracking-tighter">{isVoting ? "저장 중..." : "투표 저장하기"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
