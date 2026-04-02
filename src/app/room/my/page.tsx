'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RoomSummary {
  hashedId: string;
  title: string;
  deadline: string;
  isClosed: boolean;
  optionCount: number;
  totalVotes: number;
  createdAt: string;
}

export default function MyRoomsPage() {
  const { status } = useSession();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [fetchDone, setFetchDone] = useState(false);
  const [error, setError] = useState('');

  const loading = status === 'loading' || (status === 'authenticated' && !fetchDone);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/room/my')
        .then(res => res.json())
        .then(data => {
          setRooms(data.rooms || []);
        })
        .catch(() => setError('서버에 연결할 수 없습니다.'))
        .finally(() => setFetchDone(true));
    }
  }, [status]);

  // 마감 여부 판단
  function getStatus(room: RoomSummary) {
    if (room.isClosed) return { label: '마감됨', color: 'bg-slate-600 text-slate-300' };
    const now = new Date();
    const deadline = new Date(room.deadline);
    if (deadline < now) return { label: '기한 지남', color: 'bg-amber-600/20 text-amber-400' };
    return { label: '진행 중', color: 'bg-emerald-600/20 text-emerald-400' };
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400">불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-slate-400 text-lg">로그인이 필요합니다.</p>
          <Link href="/" className="inline-block text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors">
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-950 text-white p-6 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-20 blur-[120px] pointer-events-none">
        <div className="h-[300px] w-[400px] rounded-full bg-orange-600 mix-blend-screen"></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors mb-2 inline-block">
              ← 홈으로
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">내 투표</span> 관리
            </h1>
          </div>
          <Link
            href="/room/create"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
            새 투표
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {rooms.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-800/60 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <p className="text-slate-400 text-lg font-medium mb-2">아직 만든 투표가 없어요</p>
            <p className="text-slate-500 text-sm mb-6">새로운 투표 방을 만들어 친구들에게 공유해보세요!</p>
            <Link
              href="/room/create"
              className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95"
            >
              첫 투표 만들기
            </Link>
          </div>
        )}

        {/* Room list */}
        {rooms.length > 0 && (
          <div className="space-y-3">
            {rooms.map((room) => {
              const statusInfo = getStatus(room);
              return (
                <Link
                  key={room.hashedId}
                  href={`/room/${room.hashedId}`}
                  className="group block p-5 rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-white/5 transition-all duration-300 hover:bg-slate-800/60 hover:border-white/10 hover:scale-[1.01]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h2 className="text-lg font-bold text-white truncate group-hover:text-orange-300 transition-colors">
                          {room.title}
                        </h2>
                        <span className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          {room.optionCount}개 장소
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                          {room.totalVotes}표
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          {formatDate(room.deadline)}까지
                        </span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-600 group-hover:text-orange-400 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
