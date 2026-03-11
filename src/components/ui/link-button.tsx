'use client';

import Link from 'next/link';
import { buttonVariants } from './button';
import { cn } from '@/lib/utils';
import { VariantProps } from 'class-variance-authority';
import { ReactNode } from 'react';

interface LinkButtonProps extends VariantProps<typeof buttonVariants> {
  href: string;
  className?: string;
  children: ReactNode;
}

export function LinkButton({ href, variant, size, className, children }: LinkButtonProps) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </Link>
  );
}
