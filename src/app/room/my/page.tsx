'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Home, Calendar, Users, MapPin, ChevronRight, Trash2 } from 'lucide-react';

interface RoomSummary {
  hashedId: string;
  title: string;
  deadline: string;
  isClosed: boolean;
  optionCount: number;
  totalVotes: number;
  createdAt: string;
  participants?: any[];
  _id?: string;
  options?: any[];
}

export default function MyRoomsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchRooms();
    }
  }, [status, router]);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/room/my');
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error(err);
      setError('방 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (room: RoomSummary) => {
    if (room.isClosed || (room.deadline && new Date(room.deadline) < new Date())) {
      return { label: '투표 마감', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    }
    return { label: '진행중', color: 'bg-orange-50 text-orange-500 border-orange-100' };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleDelete = async (hashedId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/room/${hashedId}`, { method: 'DELETE' });
      if (res.ok) {
        setRooms(rooms.filter(r => r.hashedId !== hashedId));
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500">불러오는 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 pt-10 px-6 text-slate-900 flex justify-center selection:bg-orange-500/30">
      {/* 상단 네비게이션 바 */}
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

      <div className="w-full max-w-2xl space-y-8">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">내 투표 관리</h1>
          <p className="text-slate-500">내가 만든 투표 방들을 관리하고 현황을 확인하세요.</p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm text-center">
            {error}
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="p-16 rounded-[2rem] bg-white border border-slate-200 shadow-xl text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-slate-300" />
            </div>
            <div className="space-y-2">
              <p className="text-slate-900 font-bold text-xl">아직 만든 투표가 없습니다.</p>
              <p className="text-slate-500">새로운 투표 방을 만들어 친구들과 약속을 잡아보세요!</p>
            </div>
            <button 
              onClick={() => router.push('/room/create')}
              className="mt-2 px-8 py-4 rounded-2xl bg-orange-600 text-white font-bold hover:bg-orange-500 transition-all shadow-lg shadow-orange-100 active:scale-95"
            >
              투표 방 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {rooms.map((room) => {
              const statusInfo = getStatus(room);
              return (
                <div 
                  key={room.hashedId}
                  className="group relative p-6 rounded-[2rem] bg-white border border-slate-200 shadow-lg hover:shadow-2xl hover:border-orange-200 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <h2 className="text-xl font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors">{room.title}</h2>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>마감: {formatDate(room.deadline)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span>참여자: {room.participants?.length || 0}명</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>장소 후보: {room.optionCount}곳</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col gap-3 justify-end items-stretch">
                      <Link
                        href={`/room/${room.hashedId}`}
                        className="flex-1 w-full md:w-32 flex items-center justify-center gap-2 bg-orange-600 py-3 rounded-2xl text-white font-bold hover:bg-orange-500 transition-all shadow-md active:scale-95 group"
                      >
                        <span className="text-[13px]">방 입장</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                      <button
                        onClick={() => handleDelete(room.hashedId)}
                        className="flex-1 w-full md:w-32 flex items-center justify-center gap-2 bg-rose-50 text-rose-500 border border-rose-100 py-3 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-[13px] font-bold">투표 삭제</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
