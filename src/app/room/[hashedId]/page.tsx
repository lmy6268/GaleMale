'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import MapComponent, { MapPlace } from '@/components/MapComponent';
import { 
  Users, 
  MapPin, 
  ChevronLeft, 
  Trash2,
  Calendar,
  Share2,
  Home,
  Edit3,
  ExternalLink,
  Clock,
  Lock,
  Unlock
} from 'lucide-react';

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
  const [username, setUsername] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // 닉네임 등록 핸들러 (신규 유저용)
  const handleJoinWithNickname = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setNicknameError('닉네임을 입력해주세요.');
      return;
    }

    // 유효성 체크
    const nicknameRegex = /^[a-zA-Z0-9가-힣]+$/;
    if (!nicknameRegex.test(trimmed)) {
      setNicknameError('한글, 영문, 숫자만 가능합니다 (공백 불가)');
      return;
    }

    setIsJoining(true);
    setNicknameError('');

    try {
      const res = await fetch('/api/user/nickname', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowLoginPrompt(false);
        fetchRoomData();
        fetchVoteStatus();
      } else {
        setNicknameError(data.error || '등록에 실패했습니다.');
      }
    } catch {
      setNicknameError('서버 오류가 발생했습니다.');
    } finally {
      setIsJoining(false);
    }
  };
  
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  
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

  // 로그인 후 닉네임 체크 및 데이터 로드
  useEffect(() => {
    if (status === 'authenticated') {
      // 닉네임 조회 후 없으면 등록 유도
      fetch('/api/user/nickname')
        .then(res => res.json())
        .then(data => {
          if (!data.nickname) {
            setShowLoginPrompt(true); // 등록 유도를 위해 프롬프트 유지
          } else {
            setShowLoginPrompt(false);
          }
        });
      
      fetchRoomData();
      fetchVoteStatus();
    } else if (status === 'unauthenticated') {
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

  const timeRemaining = room ? (() => {
    const diff = new Date(room.deadline).getTime() - new Date().getTime();
    if (diff <= 0) return "투표 종료";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}일 ${hours}시간 남음`;
    if (hours > 0) return `${hours}시간 ${mins}분 남음`;
    return `${mins}분 남음`;
  })() : "";

  // 로그인 및 닉네임 등록 프롬프트
  if (showLoginPrompt) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 selection:bg-orange-500/30">
        {/* 상단 네비게이션 */}
        <div className="fixed top-6 left-6 z-[100]">
          <button 
            onClick={() => router.back()}
            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-orange-200 transition-all shadow-sm group"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
        <div className="fixed top-6 right-6 z-[100]">
          <button 
            onClick={() => router.push('/')}
            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-orange-200 transition-all shadow-sm group"
          >
            <Home className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 text-white">
                <MapPin className="w-10 h-10" />
              </div>
            </div>
            
            {status === 'authenticated' ? (
              <>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">반가워요</h1>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                투표에서 사용할 이름을 정성껏 적어주세요.<br />
                나중에 언제든 수정할 수 있습니다.
              </p>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="닉네임 입력 (1~20자)"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setNicknameError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinWithNickname()}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all text-center font-bold"
                    />
                    {nicknameError && (
                      <p className="text-orange-500 text-xs font-semibold text-center">{nicknameError}</p>
                    )}
                  </div>
                  <button
                    onClick={handleJoinWithNickname}
                    disabled={isJoining}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 py-4 rounded-2xl text-white font-bold text-lg shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isJoining ? '등록 중...' : '시작하기'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">함께 투표해요!</h1>
                <p className="text-slate-500 text-sm mb-10 leading-relaxed">
                  이 방의 투표에 참여하려면<br />
                  카카오 로그인으로 본인을 인증해주세요.
                </p>
                <button
                  onClick={() => signIn('kakao')}
                  className="w-full bg-[#FEE500] py-4 rounded-2xl text-black/85 font-bold text-lg shadow-lg shadow-[#FEE500]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                    <path d="M12 3C6.477 3 2 6.273 2 10.312c0 2.628 1.83 4.935 4.606 6.17-.152.545-.583 2.05-.626 2.22-.053.21.077.208.163.15.068-.046 1.078-.718 2.302-1.536 1.01.272 2.078.414 3.175.414 5.523 0 10-3.273 10-7.312S17.523 3 12 3z"/>
                  </svg>
                  <span>카카오 참여하기</span>
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">오류 발생</h1>
        <p className="text-slate-500 mb-8">{error || '방을 찾을 수 없습니다.'}</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold shadow-sm">홈으로</button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-32 pt-10 px-6 text-slate-900 flex justify-center selection:bg-orange-500/30">
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
                  className="flex-1 bg-white border border-orange-500/30 rounded-xl px-4 py-2 text-xl font-bold outline-none shadow-sm"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <button onClick={() => handleUpdateRoom({ title: newTitle })} className="bg-orange-500 text-white px-4 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20">저장</button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{room.title}</h1>
                {isCreator && (
                  <button onClick={() => { setNewTitle(room.title); setIsEditingTitle(true); }} className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all" title="제목 수정">
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            {/* 방장 정보 표시 */}
            {room.creatorNickname && (
              <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
                {room.creatorImage ? (
                  <Image src={room.creatorImage} alt="creator" width={16} height={16} className="rounded-full border border-slate-100" />
                ) : (
                  <span className="text-[10px]">👑</span>
                )}
                <span className="text-[10px] text-slate-500 font-bold tracking-widest">{room.creatorNickname} 님의 투표방</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <button 
              onClick={() => setShowParticipants(true)}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-500 border border-slate-200 shadow-sm hover:border-orange-200 hover:bg-orange-50 transition-all"
            >
              <Users className="w-3.5 h-3.5 text-orange-500/70" />
              현재 <span className="text-slate-900 font-bold group-hover:text-orange-600">{room.participantCount || 0}명</span> 참여
              <ChevronLeft className="w-3 h-3 text-slate-300 group-hover:text-orange-400 transition-transform rotate-180 group-hover:translate-x-0.5" />
            </button>
            <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white text-slate-500 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500/70" />
                <span className="font-medium text-slate-700">
                  마감: {new Date(room.deadline).toLocaleDateString('ko-KR')} {new Date(room.deadline).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
              {!isClosed && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-black border border-blue-500/20">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                    </span>
                    {timeRemaining}
                  </div>
                  {room.allowMultipleVotes && (
                    <div className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500 text-[10px] font-black border border-orange-500/20">
                      중복 투표 가능
                    </div>
                  )}
                </div>
              )}
            </div>
            {isCreator && (
              <div className="flex items-center gap-1.5 ml-1 border-l border-slate-200 pl-3">
                {!isClosed && (
                  <button 
                    onClick={handleOpenDeadlineEditor} 
                    className="p-2 rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all group"
                    title="시간 변경"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                )}
                
                {!isClosed ? (
                  <button 
                    onClick={() => handleUpdateRoom({ isClosed: true })} 
                    className="p-2 rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all group"
                    title="강제 마감"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpdateRoom({ isClosed: false })} 
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all group"
                    title="다시 열기"
                  >
                    <Unlock className="w-4 h-4" />
                  </button>
                )}
                
                <button 
                  onClick={handleDeleteRoom} 
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all group"
                  title="투표 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            {isClosed && !isCreator && <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-black uppercase">마감 완료</span>}
          </div>
          
          {isEditingDeadline && (
            <div className="max-w-sm mx-auto p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2">
               <div className="flex flex-col sm:flex-row gap-2">
                 <input type="date" value={newDeadlineDate} onChange={(e) => setNewDeadlineDate(e.target.value)} className="flex-[2] bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-orange-300" />
                 <input type="time" value={newDeadlineTime} onChange={(e) => setNewDeadlineTime(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-orange-300" />
               </div>
               <button 
                onClick={() => handleUpdateRoom({ deadline: new Date(`${newDeadlineDate}T${newDeadlineTime}`).toISOString() })}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20"
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
            <h3 className="text-lg font-black text-slate-900">어디가 좋을까요?</h3>
            {(room.allowAddOptions || isCreator) && (
              <button 
                onClick={() => setIsAddingOption(!isAddingOption)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all shadow-lg ${
                  isAddingOption 
                    ? 'bg-slate-200 text-slate-600' 
                    : 'bg-orange-500 text-white hover:scale-105 active:scale-95 shadow-orange-500/20'
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
            <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl shadow-slate-200/50">
              <div className="flex gap-2">
                <input 
                  autoFocus
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 outline-none focus:border-orange-300 text-sm placeholder-slate-400"
                  autoComplete="off"
                  placeholder="장소 이름이나 주소를 입력하세요"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (searchResults.length > 0) setSearchResults([]); // 타이핑 시작 시 이전 결과 비우기
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} disabled={isSearching} className="bg-orange-500 hover:bg-orange-600 text-white px-6 rounded-2xl font-bold shadow-lg shadow-orange-500/20">
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
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-300 transition-all flex justify-between items-center group cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="min-w-0 py-0.5">
                          <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-orange-600 transition-colors">{item.place_name}</h4>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.road_address_name || item.address_name}</p>
                        </div>
                      </div>
                      <div className="p-1.5 rounded-xl bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all text-sm font-bold">추가</div>
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
                  className={`p-6 rounded-[2.5rem] border transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-xl ${
                    isActive 
                      ? 'bg-white border-emerald-500 shadow-[0_0_40px_-15px_rgba(16,185,129,0.2)] scale-[1.02]' 
                      : 'bg-white border-slate-100 hover:border-orange-200 hover:translate-x-1'
                  }`}
                >
                  <div className="flex justify-between items-start gap-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-extrabold text-xl text-slate-900 tracking-tight group-hover:text-orange-600 transition-colors uppercase">{option.name}</span>
                        <div className="flex gap-1 items-center">
                          {option.placeUrl && <a href={option.placeUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-900 transition-all"><ExternalLink className="w-4 h-4" /></a>}
                          {isCreator && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteOption(option.placeId); }}
                              className="p-1.5 rounded-lg bg-slate-50 text-slate-300 hover:text-orange-500 hover:bg-orange-50 transition-all"
                              title="장소 삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[12px] text-slate-500 mb-4 truncate">{option.address}</p>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-black text-orange-500">{option.voteCount}<span className="text-[10px] text-slate-600 font-bold ml-1">표</span></div>
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)]" style={{ width: `${(option.voteCount / totalVotes) * 100}%` }}></div>
                        </div>
                        {isActuallyVoted && <div className="text-[10px] font-black text-emerald-500 animate-pulse">MY VOTE</div>}
                      </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-lg shadow-emerald-500/30' : 'border-slate-200 bg-white'}`}>
                      {isActive && <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 푸터 */}
        <div className="pt-12 flex flex-col gap-4 border-t border-slate-200">
          {!isClosed && (
            <div className="flex justify-center gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/5 text-blue-500 text-[11px] font-black border border-blue-500/10 shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                {timeRemaining}
              </div>
              {room.allowMultipleVotes && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/5 text-orange-500 text-[11px] font-black border border-orange-500/10 shadow-sm">
                  중복 투표 가능
                </div>
              )}
            </div>
          )}
          {(isModified || (votedPlaceIds.length === 0 && tempSelectedIds.length > 0)) && (
            <button
              onClick={handleSaveVote}
              disabled={isVoting || tempSelectedIds.length === 0}
              className="w-full py-5 rounded-2xl bg-orange-500 text-white font-black text-lg shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:grayscale-[0.5] animate-in fade-in slide-in-from-top-2"
            >
              {isVoting ? "저장 중..." : (votedPlaceIds.length === 0 ? "투표하기" : "수정하기")}
            </button>
          )}

          <button 
            onClick={() => { navigator.clipboard.writeText(window.location.href); alert('복사되었습니다!'); }} 
            className="w-full py-5 rounded-[2rem] border border-slate-200 bg-white text-slate-500 font-black text-sm hover:text-slate-900 hover:border-orange-200 hover:bg-orange-50 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm hover:shadow-md group"
          >
            <Share2 className="w-5 h-5 text-orange-500/50 group-hover:text-orange-500 transition-colors" />
            초대 링크 복사하기
          </button>
        </div>
        {/* 참여자 현황 모달 */}
        {showParticipants && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowParticipants(false)}></div>
            <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-300">
              {/* 모달 헤더 */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900">참여자별 투표 현황</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">실시간으로 반영되는 투표 결과입니다.</p>
                </div>
                <button 
                  onClick={() => setShowParticipants(false)}
                  className="p-2 rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
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
                        <div key={p.kakaoUserId || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {p.image ? (
                                <Image src={p.image} alt={p.nickname} width={40} height={40} className="rounded-full border-2 border-orange-200" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-lg shadow-inner border border-slate-300">👤</div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black text-slate-900">{p.nickname}</p>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{p.places.length}개 선택됨</p>
                              </div>
                            </div>
                            {isMe && <span className="px-2 py-0.5 rounded-md bg-white text-slate-400 text-[8px] font-black uppercase tracking-tighter border border-slate-200 shadow-sm">나</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5 ml-1 pt-1 border-t border-slate-100 mt-2 pt-3">
                            {(p.places as string[]).map((placeName, i) => (
                              <span key={i} className="px-2 py-1 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-black border border-orange-100">
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
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">📍 갈래 말래? 실시간 현황 시스템</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
