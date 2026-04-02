'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import MapComponent from '@/components/MapComponent';
import Link from 'next/link';
import PlaceImage from '@/components/PlaceImage';

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
}

export default function RoomPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const hashedId = params.hashedId as string;

  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [votedPlaceIds, setVotedPlaceIds] = useState<string[]>([]); // 중복 투표 시
  const [isVoting, setIsVoting] = useState(false);
  
  // 지도 제어 상태
  const [mapTargetCenter, setMapTargetCenter] = useState<{ lat: number, lng: number } | undefined>(undefined);
  
  // 수정/추가 모드 상태
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [newDeadlineTime, setNewDeadlineTime] = useState('');
  
  // 장소 추가 모드 상태
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
        if (Array.isArray(data.selectedPlaceIds)) {
          setVotedPlaceIds(data.selectedPlaceIds);
        } else {
          setVotedPlaceIds([data.selectedPlaceId]);
        }
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

  const handleVote = async (placeId: string) => {
    // 중복 투표 허용 여부에 따른 처리
    const alreadyVoted = votedPlaceIds.includes(placeId);
    if (!room?.allowMultipleVotes && votedPlaceIds.length > 0) {
      alert('이 방은 중복 투표가 허용되지 않습니다.');
      return;
    }
    if (alreadyVoted) {
      alert('이미 투표한 장소입니다.');
      return;
    }
    
    if (!confirm('이 장소에 투표하시겠습니까?')) return;

    setIsVoting(true);
    try {
      const res = await fetch(`/api/room/${hashedId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId }),
      });
      const data = await res.json();
      if (res.ok) {
        setVotedPlaceIds(prev => [...prev, placeId]);
        fetchRoomData();
      } else {
        alert(data.error || '투표 실패');
      }
    } catch (err) {
      console.error('Vote error:', err);
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
        fetchRoomData();
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

    const newOption = {
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
  };

  const isDeadlinePassed = room ? new Date(room.deadline) < new Date() : false;
  const isClosed = room?.isClosed || isDeadlinePassed;
  const isCreator = session?.user && (
    (session.user as { id?: string }).id === room?.creatorUserId || 
    session.user.email === room?.creatorUserId
  );

  // 투표 취소(수정) 처리
  const handleCancelVote = async () => {
    if (!confirm('기존 투표를 취소하고 다시 선택하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/room/${hashedId}/vote`, { method: 'DELETE' });
      if (res.ok) {
        setVotedPlaceIds([]);
        fetchRoomData();
      }
    } catch (err) {
      console.error('Cancel vote error:', err);
      alert('서버 오류');
    }
  };

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
    <main className="min-h-screen bg-slate-950 pb-20 pt-10 px-6 text-slate-100 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* 헤더 */}
        <div className="text-center space-y-3 relative group">
          <div className="inline-flex px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold tracking-widest uppercase">장소 결정 투표</div>
          
          <div className="flex flex-col items-center gap-2">
            {isEditingTitle ? (
              <div className="flex w-full gap-2 px-4">
                <input 
                  autoFocus
                  className="flex-1 bg-slate-900 border border-orange-500/50 rounded-xl px-4 py-2 text-xl font-bold outline-none"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateRoom({ title: newTitle })}
                />
                <button onClick={() => handleUpdateRoom({ title: newTitle })} className="bg-orange-500 text-white px-4 rounded-xl font-bold">저장</button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-black text-white">{room.title}</h1>
                {isCreator && (
                  <button onClick={() => { setNewTitle(room.title); setIsEditingTitle(true); }} className="p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-500 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            마감: {new Date(room.deadline).toLocaleString('ko-KR')}
            {isCreator && !isClosed && (
              <button 
                onClick={() => setIsEditingDeadline(!isEditingDeadline)} 
                className="ml-1 text-xs text-orange-500/70 hover:text-orange-500 underline underline-offset-2"
              >
                시간 변경
              </button>
            )}
            {isClosed && <span className="ml-2 px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">마감됨</span>}
          </div>
          
          {isEditingDeadline && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2">
               <div className="flex gap-2">
                 <input type="date" value={newDeadlineDate} onChange={(e) => setNewDeadlineDate(e.target.value)} className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 outline-none" />
                 <input type="time" value={newDeadlineTime} onChange={(e) => setNewDeadlineTime(e.target.value)} className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 outline-none" />
               </div>
               <button 
                onClick={() => handleUpdateRoom({ deadline: new Date(`${newDeadlineDate}T${newDeadlineTime}`).toISOString() })}
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all"
               >
                 수정 완료
               </button>
            </div>
          )}
        </div>

        {/* 지도 영역 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 ml-1 flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
            후보 장소 위치 한눈에 보기
          </h3>
          <MapComponent 
            places={room.options} 
            center={mapTargetCenter || (room.options.length > 0 ? { lat: Number(room.options[0].y), lng: Number(room.options[0].x) } : undefined)}
          />
        </div>

        {/* 투표 리스트 */}
        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-end px-1">
            <h3 className="text-sm font-semibold text-slate-300">마음에 드는 장소를 골라주세요 {room.allowMultipleVotes && <span className="text-orange-500/70 text-xs ml-1">(중복 투표 가능)</span>}</h3>
            {room.allowAddOptions && (
              <button onClick={() => setIsAddingOption(!isAddingOption)} className={`text-xs font-bold transition-colors flex items-center gap-1 ${isAddingOption ? 'text-orange-500' : 'text-rose-400 hover:text-rose-300'}`}>
                {isAddingOption ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    닫기
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                    장소 추가
                  </>
                )}
              </button>
            )}
          </div>

          {isAddingOption && (
            <div className="p-5 rounded-[2rem] bg-slate-900 border border-orange-500/30 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-2xl shadow-orange-950/20">
              <div className="flex gap-2">
                <input 
                  autoFocus
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-orange-500/50 transition-colors"
                  placeholder="추가할 장소를 검색하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} disabled={isSearching} className="bg-orange-600 hover:bg-orange-500 text-white px-5 rounded-xl font-bold flex items-center gap-2">
                  {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '검색'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="grid gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {searchResults.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-white/5 hover:border-white/20 transition-all flex justify-between items-center group">
                      <div className="flex-1 min-w-0 flex gap-3">
                        <PlaceImage 
                          src={item.imageUrl} 
                          name={item.place_name} 
                          category={item.category_name} 
                          className="w-10 h-10 rounded-lg"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{item.place_name}</h4>
                          <p className="text-[10px] text-slate-500 truncate">{item.road_address_name || item.address_name}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddOption(item)}
                        className="ml-3 shrink-0 p-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="grid gap-3">
            {room.options.map((option) => {
              const isVoted = votedPlaceIds.includes(option.placeId);
              return (
                <div 
                  key={option.placeId}
                  onClick={() => setMapTargetCenter({ lat: Number(option.y), lng: Number(option.x) })}
                  className={`p-5 rounded-[2rem] border transition-all cursor-pointer group ${
                    isVoted 
                      ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_20px_-10px_rgba(249,115,22,0.3)]' 
                      : 'bg-slate-900/40 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border border-white/5">
                      <PlaceImage 
                        src={option.imageUrl} 
                        name={option.name} 
                        category={option.category} 
                        className="w-full h-full"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-white truncate">{option.name}</span>
                        {option.placeUrl && (
                          <a 
                            href={option.placeUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded-md bg-slate-800 text-slate-500 hover:text-white transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                          </a>
                        )}
                      </div>
                      <p className="text-[12px] text-slate-500 mb-4 truncate">{option.address}</p>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-xl font-black text-orange-500">
                          {option.voteCount}<span className="text-[10px] text-slate-600 font-bold ml-0.5 uppercase tracking-tighter">표</span>
                        </div>
                        <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-500 to-rose-500"
                            style={{ width: `${(option.voteCount / (room.options.reduce((a, b) => a + b.voteCount, 0) || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={isClosed || (isVoted && !room.allowMultipleVotes) || isVoting}
                      onClick={(e) => { e.stopPropagation(); handleVote(option.placeId); }}
                      className={`shrink-0 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all ${
                        isVoted
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-950/40'
                          : isClosed
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-950 hover:bg-orange-50'
                      }`}
                    >
                      {isVoted ? '내 선택' : isClosed ? '마감됨' : '선택'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 푸터 영역 */}
        <div className="pt-8 flex flex-col gap-3">
          {votedPlaceIds.length > 0 && !isClosed && (
            <button 
              onClick={handleCancelVote}
              className="w-full py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2 mb-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M15.172 2.172a2 2 0 112.828 2.828L11.828 10l-4.243 1.414L9 7.172l6.172-6.172z"></path></svg>
              내 투표 수정하기
            </button>
          )}

          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('링크가 복사되었습니다!');
            }}
            className="w-full py-4 rounded-2xl border border-white/5 bg-slate-900/60 text-slate-400 font-bold hover:text-white transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
            방 링크 복사해서 공유하기
          </button>
          
          <Link href="/" className="text-center text-slate-600 text-sm hover:text-slate-400 transition py-2">홈으로 돌아가기</Link>
        </div>

      </div>
    </main>
  );
}
