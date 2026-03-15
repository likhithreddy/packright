import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';

export function HeroSection() {
  return (
    <div className="flex flex-col items-start justify-center h-full gap-2 sm:gap-6 lg:gap-8 z-10 shrink min-h-0">
      <div className="space-y-1 lg:space-y-4">
        <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-[9px] sm:text-xs lg:text-sm pl-1 border-l-2 border-primary">
          Premium Group Travel
        </h2>
        <h1 className="text-3xl sm:text-6xl md:text-7xl xl:text-[5.5rem] font-serif font-black text-[#1A231C] leading-[0.95] tracking-tight">
          Pack together,
          <br />
          <span className="text-primary/90 italic font-medium opacity-90 block mt-1">
            show up ready.
          </span>
        </h1>
        <p className="text-[10px] sm:text-base lg:text-lg text-stone-600 mt-1 sm:mt-5 lg:mt-8 leading-snug sm:leading-relaxed max-w-[280px] sm:max-w-lg lg:max-w-xl font-medium">
          The editorial packing board for groups who care. Claim items, sync in real-time, and
          ensure nobody arrives with three chargers and zero sunscreen.
        </p>
      </div>

      <div className="flex flex-row items-center gap-2 sm:gap-4 mt-2 sm:mt-4 w-full sm:w-auto">
        <Link href="/signup" className="flex-1 sm:flex-none">
          <Button className="w-full sm:w-auto bg-[#1A231C] text-[#FBFBF9] text-[10px] sm:text-sm font-semibold px-2 sm:px-8 py-2 sm:py-6 lg:py-7 hover:bg-primary transition-all group h-8 sm:h-auto">
            Start Packing Free
            <ArrowUpRight className="ml-1.5 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Button>
        </Link>
        <Link href="/login" className="flex-1 sm:flex-none">
          <Button
            variant="ghost"
            className="w-full sm:w-auto text-[10px] sm:text-sm font-semibold px-2 sm:px-6 py-2 sm:py-6 lg:py-7 hover:bg-stone-200/50 text-stone-700 transition-colors h-8 sm:h-auto"
          >
            Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
