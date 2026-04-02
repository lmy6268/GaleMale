'use client';

import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function AuthButton() {
  const { data: session, status } = useSession();
  const [nickname, setNickname] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(true);
  const [nicknameError, setNicknameError] = useState('');

  // 로그인 후 닉네임 존재 여부 확인
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/user/nickname')
        .then(res => res.json())
        .then(data => setNickname(data.nickname))
        .catch(() => setNickname(null))
        .finally(() => setCheckingNickname(false));
    } else if (status !== 'loading') {
      setCheckingNickname(false);
    }
  }, [status]);

  // 닉네임 등록
  const handleSetNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      setNicknameError('닉네임을 입력해주세요.');
      return;
    }
    if (trimmed.length > 20) {
      setNicknameError('20자 이내로 입력해주세요.');
      return;
    }

    setNicknameLoading(true);
    setNicknameError('');

    try {
      const res = await fetch('/api/user/nickname', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setNickname(data.nickname);
      } else {
        setNicknameError(data.error || '등록에 실패했습니다.');
      }
    } catch {
      setNicknameError('서버에 연결할 수 없습니다.');
    } finally {
      setNicknameLoading(false);
    }
  };

  // 로딩 상태
  if (status === 'loading' || (status === 'authenticated' && checkingNickname)) {
    return <div className="h-[60px] w-full animate-pulse bg-slate-800 rounded-2xl"></div>;
  }

  // 로그인 됨 + 닉네임 미등록 → 닉네임 등록 UI
  if (session && nickname === null) {
    return (
      <div className="flex flex-col gap-4 w-full items-center">
        <div className="w-full p-5 rounded-2xl bg-slate-800/60 backdrop-blur-sm border border-white/10">
          <p className="text-slate-300 text-sm font-medium mb-1">환영합니다! 🎉</p>
          <p className="text-slate-400 text-xs mb-4">투표에서 사용할 이름을 등록해주세요.</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={nicknameInput}
              onChange={e => {
                setNicknameInput(e.target.value);
                setNicknameError('');
              }}
              onKeyDown={e => e.key === 'Enter' && handleSetNickname()}
              placeholder="닉네임 입력 (최대 20자)"
              maxLength={20}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-all"
            />
            <button
              onClick={handleSetNickname}
              disabled={nicknameLoading}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              {nicknameLoading ? '...' : '등록'}
            </button>
          </div>
          {nicknameError && (
            <p className="text-red-400 text-xs mt-2">{nicknameError}</p>
          )}
        </div>
      </div>
    );
  }

  // 로그인 됨 + 닉네임 있음 → 메인 UI
  if (session && nickname) {
    return (
      <div className="flex flex-col gap-4 w-full items-center">
        <p className="text-slate-300 text-base font-medium">
          안녕하세요, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400 font-bold">{nickname}</span>님 👋
        </p>

        <Link 
          href="/room/create"
          className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 px-6 py-4 text-lg font-bold text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_-5px_rgba(244,63,94,0.5)] active:scale-[0.98]"
        >
          <span>새 투표 방 만들기</span>
          <svg className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
          </svg>
        </Link>

        <Link
          href="/room/my"
          className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-800/60 backdrop-blur-sm px-6 py-3.5 text-base font-semibold text-slate-300 transition-all duration-300 hover:bg-slate-700/60 hover:text-white hover:border-white/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5 text-orange-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
          </svg>
          <span>내 투표 관리하기</span>
        </Link>
      </div>
    );
  }

  // 미로그인 → 카카오 로그인 버튼
  return (
    <button 
      onClick={() => signIn('kakao')}
      className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] px-6 py-4 text-lg font-bold text-black/85 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_-5px_rgba(254,229,0,0.4)] active:scale-[0.98]"
    >
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <path d="M12 3C6.477 3 2 6.273 2 10.312c0 2.628 1.83 4.935 4.606 6.17-.152.545-.583 2.05-.626 2.22-.053.21.077.208.163.15.068-.046 1.078-.718 2.302-1.536 1.01.272 2.078.414 3.175.414 5.523 0 10-3.273 10-7.312S17.523 3 12 3z"/>
      </svg>
      <span>카카오 로그인으로 시작하기</span>
    </button>
  );
}
