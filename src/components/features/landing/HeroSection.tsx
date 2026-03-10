import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <div className="flex flex-col items-start max-w-2xl justify-center h-full gap-8 z-10">
      <div className="space-y-4">
        <h2 className="text-primary font-bold tracking-widest uppercase text-sm">
          Group Travel, Finally Sorted
        </h2>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold text-foreground leading-[1.1]">
          Pack together, <br />
          <span className="text-primary/90 italic drop-shadow-sm">show up ready.</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-6 leading-relaxed max-w-xl">
          PackRight gives your trip group a shared board where everyone claims items, tracks
          what&#39;s packed, and no one shows up with three chargers and zero sunscreen.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 w-full sm:w-auto">
        <Link href="/signup" className="w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full sm:w-auto rounded-xl text-base font-semibold px-8 py-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
        <Link href="/login" className="w-full sm:w-auto">
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto rounded-xl text-base font-semibold px-8 py-6 border-2 border-border/80 hover:bg-secondary/50 transition-colors"
          >
            Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
