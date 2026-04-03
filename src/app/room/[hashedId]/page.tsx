'use client';

import { useSession, signIn } from 'next-auth/react';
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
  creatorNickname?: string;
  creatorImage?: string | null;
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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  
  const [loginNickname, setLoginNickname] = useState('');
  
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
      const customNick = localStorage.getItem('pendingNickname');
      if (customNick) {
        fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname: customNick }),
        }).then(() => {
          localStorage.removeItem('pendingNickname');
          fetchRoomData();
          fetchVoteStatus();
        });
      } else {
        fetchRoomData();
        fetchVoteStatus();
      }
      setShowLoginPrompt(false);
    } else if (status === 'unauthenticated') {
      setLoading(false);
      setShowLoginPrompt(true);
    }
  }, [status, fetchRoomData, fetchVoteStatus]);

  const fetchParticipants = useCallback(async () => {
    if (!hashedId) return;
    setLoadingParticipants(true);
    try {
      const res = await fetch(`/api/room/${hashedId}/participants`);
      const data = await res.json();
      if (res.ok) setParticipants(data.participants || []);
    } catch (err) {
      console.error('Fetch participants error:', err);
    } finally {
      setLoadingParticipants(false);
    }
  }, [hashedId]);

  useEffect(() => {
    if (showParticipants) {
      fetchParticipants();
    }
  }, [showParticipants, fetchParticipants]);


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
    
    // 추천 UX 개선: 결과 초기화 및 닫기
    setSearchResults([]);
    setSearchQuery('');
    setIsAddingOption(false);
  };

  const handleDeleteOption = async (placeId: string) => {
    if (!window.confirm('이 장소를 투표 목록에서 삭제하시겠습니까? 관련 투표 데이터도 모두 삭제됩니다.')) return;
    const updatedOptions = room?.options.filter(o => o.placeId !== placeId) || [];
    await handleUpdateRoom({ options: updatedOptions });
  };

  const handleOpenDeadlineEditor = () => {
    if (room?.deadline) {
      const d = new Date(room.deadline);
      const dateStr = d.toISOString().split('T')[0];
      const timeStr = d.toTimeString().slice(0, 5);
      setNewDeadlineDate(dateStr);
      setNewDeadlineTime(timeStr);
    }
    setIsEditingDeadline(true);
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

  const handleSignIn = () => {
    if (loginNickname.trim()) {
      localStorage.setItem('pendingNickname', loginNickname.trim());
    }
    signIn('kakao', { callbackUrl: window.location.href });
  };

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin"></div>
      </main>
    );
  }

  if (status === 'unauthenticated' || showLoginPrompt) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
                <span className="text-3xl font-bold">📍</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent">갈래 말래?</h1>
              <p className="text-slate-400 font-medium tracking-tight">초대받은 투표 방에 오신 것을 환영합니다!</p>
            </div>

            <div className="py-6 px-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                프라이빗 투표에 참여하고 장소를 추천하려면<br/>
                <span className="text-orange-400 font-bold underline underline-offset-4 decoration-orange-500/30">카카오 로그인</span>이 필요합니다.
              </p>
              
              <div className="pt-2 text-left space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">투표에 사용할 닉네임 (선택)</label>
                <input 
                  type="text" 
                  autoComplete="off"
                  value={loginNickname}
                  onChange={(e) => setLoginNickname(e.target.value)}
                  placeholder="미입력 시 카카오톡 이름 사용" 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500/50 text-sm text-white placeholder-slate-600 transition-colors"
                />
              </div>
            </div>

            <button 
              onClick={handleSignIn}
              className="group w-full py-4 rounded-2xl bg-[#FEE500] text-[#191919] font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#FDD800] transition-all active:scale-[0.98] shadow-[0_0_30px_-10px_rgba(254,229,0,0.4)]"
            >
              <svg className="w-6 h-6 transform group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 3.073-9 6.863 0 2.456 1.69 4.606 4.24 5.86l-.84 3.124c-.1.35.1.7.45.6.3-.1.55-.25.85-.45l3.55-2.352c.25.05.5.05.75.05 4.97 0 9-3.073 9-6.863S16.97 3 12 3z"/>
              </svg>
              카카오로 참여하기
            </button>

            <button onClick={() => router.push('/')} className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors">
              다음에 할게요
            </button>
          </div>
        </div>
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
            {/* 방장 정보 표시 */}
            {room.creatorNickname && (
              <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-white/5 border border-white/5 rounded-full backdrop-blur-sm">
                {room.creatorImage ? (
                  <img src={room.creatorImage} alt="creator" className="w-4 h-4 rounded-full border border-white/10" />
                ) : (
                  <span className="text-[10px]">👑</span>
                )}
                <span className="text-[10px] text-slate-400 font-bold tracking-widest">{room.creatorNickname} 님의 투표방</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <button 
              onClick={() => setShowParticipants(true)}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/50 text-slate-400 border border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all"
            >
              <svg className="w-3.5 h-3.5 text-orange-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              현재 <span className="text-white font-bold group-hover:text-orange-400">{room.participantCount || 0}명</span> 참여
              <svg className="w-3 h-3 text-slate-600 group-hover:text-orange-500 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
            <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900/50 text-slate-400 border border-white/5">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-blue-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span className="font-medium text-white/90">
                  마감: {new Date(room.deadline).toLocaleDateString('ko-KR')} {new Date(room.deadline).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
              {!isClosed && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-black border border-blue-500/20">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                  </span>
                  {(() => {
                    const diff = new Date(room.deadline).getTime() - new Date().getTime();
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    if (days > 0) return `${days}일 ${hours}시간 남음`;
                    if (hours > 0) return `${hours}시간 ${mins}분 남음`;
                    return `${mins}분 남음`;
                  })()}
                </div>
              )}
            </div>
            {isCreator && !isClosed && (
              <button 
                onClick={handleOpenDeadlineEditor} 
                className="p-1 px-2 rounded-lg text-slate-500 hover:text-orange-400 hover:bg-orange-500/5 transition-all text-[10px] font-bold"
              >
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
              setMapTargetCenter({ lat: Number(place.y), lng: Number(place.x) });
            }}
            onAddPlace={(place) => {
              const original = searchResults.find(s => s.id === place.placeId);
              if (original) handleAddOption(original);
            }}
          />

        </div>

        {/* 투표 리스트 */}
        <div className="space-y-5 pt-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-black text-white">어디가 좋을까요?</h3>
            {(room.allowAddOptions || isCreator) && (
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
                  autoComplete="off"
                  placeholder="장소 이름이나 주소를 입력하세요"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (searchResults.length > 0) setSearchResults([]); // 타이핑 시작 시 이전 결과 비우기
                  }}
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
                        <div className="flex gap-1 items-center">
                          {option.placeUrl && <a href={option.placeUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>}
                          {isCreator && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteOption(option.placeId); }}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="장소 삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          )}
                        </div>
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
          <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] max-w-lg z-[100] animate-in slide-in-from-bottom-8 duration-500 font-sans">
            <div className="p-3 sm:p-4 rounded-3xl sm:rounded-[2.5rem] bg-white/95 backdrop-blur-xl shadow-2xl border border-white flex items-center justify-between gap-2 sm:gap-4">
              <div className="pl-2 sm:pl-4">
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">장소 선택됨</p>
                <p className="text-base sm:text-lg font-black text-slate-900 leading-none">{tempSelectedIds.length}개 후보</p>
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                <button onClick={() => setTempSelectedIds(votedPlaceIds)} className="px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-xs sm:text-sm">취소</button>
                <button onClick={handleSaveVote} disabled={isVoting} className="px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-950 text-white font-black text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 tracking-tighter whitespace-nowrap">{isVoting ? "저장 중..." : "투표 저장하기"}</button>
              </div>
            </div>
          </div>
        )}
        {/* 참여자 현황 모달 */}
        {showParticipants && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowParticipants(false)}></div>
            <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-300">
              {/* 모달 헤더 */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white">참여자별 투표 현황</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">실시간으로 반영되는 투표 결과입니다.</p>
                </div>
                <button 
                  onClick={() => setShowParticipants(false)}
                  className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              {/* 모달 콘텐츠 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {loadingParticipants ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-8 h-8 border-3 border-slate-700 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500 font-bold">참여자 정보를 불러오는 중...</p>
                  </div>
                ) : participants.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="text-4xl">😶</div>
                    <p className="text-slate-400 font-bold">아직 참여자가 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {participants.map((p, idx) => {
                      const isMe = sessionUser && (sessionUser.id === p.kakaoUserId);
                      return (
                        <div key={p.kakaoUserId || idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {p.image ? (
                                <img src={p.image} alt={p.nickname} className="w-10 h-10 rounded-full border-2 border-orange-500/30" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center text-lg shadow-inner border border-white/10">👤</div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black text-white">{p.nickname}</p>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{p.places.length}개 선택됨</p>
                              </div>
                            </div>
                            {isMe && <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-500 text-[8px] font-black uppercase tracking-tighter border border-white/5">나</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5 ml-1 pt-1 border-t border-white/5 mt-2 pt-3">
                            {p.places.map((placeName: string, i: number) => (
                              <span key={i} className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-[10px] font-black border border-orange-500/20">
                                {placeName}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 모달 푸터 */}
              <div className="p-4 bg-slate-950/50 border-t border-white/5 text-center">
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">📍 갈래 말래? 실시간 현황 시스템</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
