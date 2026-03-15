import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex bg-background">
      {/* Left Column: Branding / Information (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col w-1/2 bg-primary/5 border-r border-border/50 relative overflow-hidden">
        {/* Decorative ambient background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-primary/10 to-transparent pointer-events-none" />

        <div className="flex flex-col h-full justify-between p-8 xl:p-12 relative z-10">
          <div>
            <Link
              href="/"
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </div>

          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl font-serif font-bold text-foreground">PackRight</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Join thousands of travelers who have eliminated the chaos of group packing. Plan,
              assign, and show up ready.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PackRight Inc.
          </div>
        </div>
      </div>

      {/* Right Column: Auth Forms (Full width on mobile) */}
      <div className="w-full h-full lg:w-1/2 flex items-center justify-center p-3 sm:p-6 lg:p-12 relative overflow-hidden">
        {/* Mobile Back Button */}
        <div className="absolute top-3 left-3 sm:top-6 sm:left-6 lg:hidden z-20">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Home
          </Link>
        </div>

        {/* 
          This wrapper guarantees the child (the form pages) can never exceed 
          the parent's height minus the padding (p-6/p-12), ensuring the card 
          always has a visual gap from the top and bottom of the screen.
          We use max-w-lg to allow side-by-side fields in forms to breathe.
        */}
        <div className="w-full max-w-lg h-full max-h-[850px] flex flex-col justify-center min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
