import { AuthButton } from '@/components/AuthButton';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-6 overflow-hidden">
      {/* Background Micro-animations & Aesthetics (Lighter tones) */}
      <div className="absolute top-0 flex w-full justify-center rotate-12 opacity-40 blur-[120px] pointer-events-none">
        <div className="h-[400px] w-[300px] rounded-full bg-orange-200 mix-blend-multiply animate-pulse"></div>
        <div className="h-[300px] w-[400px] rounded-full bg-rose-200 mix-blend-multiply animate-pulse delay-700"></div>
      </div>

      <div className="relative text-center max-w-lg w-full flex flex-col items-center gap-10 z-10 p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/50">
        <div className="space-y-5">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-600 leading-tight">
            갈래 말래?
          </h1>
          <p className="text-slate-500 text-[1.15rem] leading-relaxed font-medium">
            친구들과 함께 복잡한 과정 없이<br/>약속 장소를 결정하세요.
          </p>
        </div>

        <div className="w-full">
          <AuthButton />
        </div>
      </div>
    </main>
  );
}
