import { AuthButton } from '@/components/AuthButton';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 overflow-hidden">
      {/* Background Micro-animations & Aesthetics */}
      <div className="absolute top-0 flex w-full justify-center rotate-12 opacity-30 blur-[120px] pointer-events-none">
        <div className="h-[400px] w-[300px] rounded-full bg-orange-600 mix-blend-screen animate-pulse"></div>
        <div className="h-[300px] w-[400px] rounded-full bg-rose-600 mix-blend-screen animate-pulse delay-700"></div>
      </div>

      <div className="relative text-center max-w-lg w-full flex flex-col items-center gap-10 z-10 p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 shadow-2xl">
        <div className="space-y-5">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500 leading-tight">
            갈래 말래?
          </h1>
          <p className="text-slate-400 text-[1.15rem] leading-relaxed font-medium">
            친구들과 함께 복잡한 과정 없이<br/>약속 장소를 결정하세요.
          </p>
        </div>

        <div className="w-full">
          <AuthButton />
        </div>
        
        <div className="pt-4 border-t border-white/10 w-full">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            이 서비스는 초대받은 프라이빗 링크로만 작동합니다.<br/>공개된 투표 목록은 외부에 노출되지 않습니다.
          </p>
        </div>
      </div>
    </main>
  );
}
