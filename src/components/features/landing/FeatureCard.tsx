import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 rounded-full bg-white/95 backdrop-blur-md p-1.5 sm:p-2 pr-4 sm:pr-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-stone-200/50 hover:border-stone-300 transition-all hover:-translate-y-1">
      <div className="h-6 w-6 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-[#1A231C] text-[#FBFBF9] shrink-0">
        <Icon className="h-3 w-3 sm:h-5 sm:w-5" />
      </div>
      <div className="flex flex-col justify-center">
        <h3 className="text-[#1A231C] font-bold text-[10px] sm:text-sm tracking-wide leading-tight">
          {title}
        </h3>
        <p className="hidden sm:block text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-0.5 leading-tight">
          {description}
        </p>
      </div>
    </div>
  );
}
