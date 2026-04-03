import { AuthButton } from '@/components/AuthButton';
import { MapPin } from 'lucide-react';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-6 overflow-hidden">
      {/* Background Micro-animations & Aesthetics (Lighter tones) */}
      <div className="absolute top-0 flex w-full justify-center rotate-12 opacity-40 blur-[120px] pointer-events-none">
        <div className="h-[400px] w-[300px] rounded-full bg-orange-200 mix-blend-multiply animate-pulse"></div>
        <div className="h-[300px] w-[400px] rounded-full bg-orange-100 mix-blend-multiply animate-pulse delay-700"></div>
      </div>

      <div className="relative text-center max-w-lg w-full flex flex-col items-center gap-12 z-10 p-10 rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl shadow-slate-200/50">
        <div className="space-y-6 flex flex-col items-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 text-white">
              <MapPin className="w-10 h-10" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-2">
            갈래 말래?
          </h1>
        </div>

        <div className="w-full flex flex-col items-center gap-10">
          <AuthButton />
          
          <p className="text-slate-500 text-[1.1rem] font-medium max-w-[280px]">
            친구들과 함께 복잡한 과정 없이<br/>약속 장소를 결정하세요.
          </p>
        </div>
      </div>
    </main>
  );
}
