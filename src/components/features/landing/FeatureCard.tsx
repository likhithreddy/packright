import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl sm:rounded-2xl bg-card p-4 sm:p-5 lg:p-6 shadow-sm border border-border/50 hover:border-border/80 transition-colors">
      <div className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div>
        <h3 className="text-secondary-foreground font-semibold text-base sm:text-lg">{title}</h3>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
