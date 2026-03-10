import { HeroSection } from '@/components/features/landing/HeroSection';
import { FeatureCard } from '@/components/features/landing/FeatureCard';
import { TripBoardMockCard } from '@/components/features/landing/TripBoardMockCard';
import { Sparkles, Dice5, BarChart2 } from 'lucide-react';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col p-6 lg:p-10 xl:px-24 border-border">
      {/* Container for maximum width */}
      <div className="w-full h-full max-w-7xl mx-auto flex flex-col gap-6 lg:gap-10 relative">
        {/* Top Fold: Hero & Interactive Mock */}
        <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column: Typography & CTAs */}
          <HeroSection />

          {/* Right Column: Visual Mockup */}
          <div className="w-full h-full max-h-[50vh] lg:max-h-none flex justify-center items-center lg:items-end xl:items-center min-h-0">
            <TripBoardMockCard />
          </div>
        </section>

        {/* Bottom Fold: Features */}
        <section className="h-auto grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 pb-2">
          <FeatureCard
            icon={Sparkles}
            title="AI Packing Lists"
            description="Describe your trip, get a list instantly"
          />
          <FeatureCard
            icon={Dice5}
            title="Auto-Assign"
            description="Distribute unclaimed items in one click"
          />
          <FeatureCard
            icon={BarChart2}
            title="Live Readiness"
            description="See group packing status in real time"
          />
        </section>
      </div>
    </main>
  );
}
