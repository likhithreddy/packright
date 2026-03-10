import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-sm border border-border/50 hover:border-border/80 transition-colors">
      <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-secondary-foreground font-semibold text-lg">{title}</h3>
        <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
