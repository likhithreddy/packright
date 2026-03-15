import { HeroSection } from '@/components/features/landing/HeroSection';
import { FeatureCard } from '@/components/features/landing/FeatureCard';
import { TripBoardMockCard } from '@/components/features/landing/TripBoardMockCard';
import { Sparkles, Dice5, BarChart2 } from 'lucide-react';

export default function Home() {
  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-[#FBFBF9] text-foreground flex flex-col">
      {/* Editorial Ambient Background */}
      <div className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="pointer-events-none absolute -top-[20%] -right-[10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[100px] opacity-40 mix-blend-multiply" />
      <div className="pointer-events-none absolute -bottom-[20%] -left-[10%] w-[40vw] h-[40vw] bg-stone-300 rounded-full blur-[100px] opacity-30 mix-blend-multiply" />

      <div className="relative w-full h-full max-w-[1400px] mx-auto flex flex-col lg:block p-4 sm:p-8 lg:p-16 pb-3 sm:pb-8 lg:pb-16 gap-3 sm:gap-4 lg:gap-0">
        {/* Mobile: top-down stack. Desktop: absolute overlay grid */}

        {/* Typography Area */}
        <div className="w-full lg:w-[50%] xl:w-[60%] lg:absolute lg:top-1/2 lg:-translate-y-1/2 lg:left-8 xl:left-16 z-20 shrink-0">
          <HeroSection />
        </div>

        {/* Visual Mockup Area — fills remaining space on mobile */}
        <div className="flex-1 min-h-0 w-full flex justify-center items-center lg:absolute lg:top-1/2 lg:-translate-y-1/2 lg:right-8 xl:right-16 lg:w-[45%] xl:w-[45%] z-10">
          <div className="w-full max-w-[280px] sm:max-w-md lg:max-w-lg h-full lg:h-[600px] transform lg:-rotate-2 transition-transform duration-700 hover:rotate-0 hover:scale-105 shadow-md lg:shadow-2xl relative mx-auto rounded-2xl sm:rounded-[2rem]">
            <div className="w-full h-full absolute inset-0">
              <TripBoardMockCard />
            </div>
            {/* Desktop Float Features */}
            <div className="hidden lg:flex absolute -left-12 top-[10%] drop-shadow-md">
              <FeatureCard icon={Sparkles} title="AI Packing" description="Instantly generated" />
            </div>
            <div className="hidden lg:flex absolute -right-8 bottom-[35%] drop-shadow-md">
              <FeatureCard icon={Dice5} title="Auto-Assign" description="One-click claim" />
            </div>
            <div className="hidden lg:flex absolute left-8 -bottom-6 drop-shadow-md">
              <FeatureCard
                icon={BarChart2}
                title="Live Readiness"
                description="Group packing sync"
              />
            </div>
          </div>
        </div>

        {/* Mobile Features Area - Only visible on small screens */}
        <div className="lg:hidden w-full flex flex-row flex-wrap justify-center gap-2 pb-2 shrink-0">
          <FeatureCard icon={Sparkles} title="AI Packing" description="Instant generation" />
          <FeatureCard icon={Dice5} title="Auto-Assign" description="One-click claim" />
          <FeatureCard icon={BarChart2} title="Live Status" description="Group sync" />
        </div>
      </div>
    </main>
  );
}
