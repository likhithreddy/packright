import { Users, Calendar, MapPin } from 'lucide-react';

export function TripBoardMockCard() {
  return (
    <div className="w-full h-full rounded-2xl sm:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl relative shadow-primary/5 border border-border/50 shrink min-h-0 bg-card">
      {/* Top Banner (Header Graphic) */}
      <div className="h-1/3 sm:h-1/2 w-full bg-gradient-to-br from-primary/80 to-primary relative flex items-center justify-center">
        {/* Subtle noise/texture overlay would go here in production, using a radial gradient to simulate depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
        <MapPin className="h-6 w-6 sm:h-12 sm:w-12 text-primary-foreground/90 absolute drop-shadow-md" />
      </div>

      {/* Bottom Content Area */}
      <div className="h-2/3 sm:h-1/2 w-full bg-card p-3 sm:p-6 flex flex-col justify-between">
        <div>
          <h3 className="font-serif text-lg sm:text-2xl font-bold text-foreground">
            Smoky Mountains
          </h3>
          <div className="flex items-center gap-2 sm:gap-4 mt-1 sm:mt-3 text-xs sm:text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Mar 15 – Mar 19</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>4 members</span>
            </div>
          </div>
        </div>

        {/* Progress Bar Mock */}
        <div className="mt-2 sm:mt-4">
          <div className="flex justify-between items-end mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-muted-foreground">
              Packed
            </span>
            <span className="text-xs sm:text-sm font-semibold text-foreground">62%</span>
          </div>
          <div className="h-1.5 sm:h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '62%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
