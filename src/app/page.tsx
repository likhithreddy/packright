import { HeroSection } from '@/components/features/landing/HeroSection';
import { FeatureCard } from '@/components/features/landing/FeatureCard';
import { TripBoardMockCard } from '@/components/features/landing/TripBoardMockCard';
import { Sparkles, Dice5, BarChart2 } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col pt-20 pb-16 px-6 lg:px-12 xl:px-24">
      {/* Container for maximum width */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-24">
        {/* Top Fold: Hero & Interactive Mock */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center min-h-[60vh]">
          {/* Left Column: Typography & CTAs */}
          <HeroSection />

          {/* Right Column: Visual Mockup */}
          <div className="w-full flex justify-center items-center">
            <TripBoardMockCard />
          </div>
        </section>

        {/* Bottom Fold: Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
