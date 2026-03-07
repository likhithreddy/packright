import type { Metadata } from 'next';
import './globals.css';
import { Figtree, DM_Serif_Display } from "next/font/google";
import { cn } from "@/lib/utils";

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' });
const dmSerifDisplay = DM_Serif_Display({ weight: '400', subsets: ['latin'], variable: '--font-dm-serif' });

export const metadata: Metadata = {
    title: 'PackRight',
    description: 'Collaborative packing, made simple.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={cn("font-sans", figtree.variable, dmSerifDisplay.variable)}>
            <body className="antialiased font-sans">{children}</body>
        </html>
    );
}
