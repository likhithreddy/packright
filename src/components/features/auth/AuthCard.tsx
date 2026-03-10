import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <Card className="w-full max-h-full flex flex-col border-border/50 shadow-lg shadow-primary/5 bg-card text-card-foreground">
      <CardHeader className="space-y-2 pb-6 shrink-0">
        <CardTitle className="font-serif text-3xl font-bold tracking-tight">{title}</CardTitle>
        <CardDescription className="text-base text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto min-h-0 pl-6 pr-6 pb-6">
        {children}
      </CardContent>
    </Card>
  );
}
