'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock } from 'lucide-react';

export default function TripDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  return (
    <div className="flex flex-col h-full bg-[#FAFAF8] p-8 font-sans">
      <div className="max-w-4xl mx-auto w-full">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="mb-8 -ml-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="bg-white border border-stone-200 rounded-3xl p-12 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-[#F5F3ED] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-[#2D3A30]" />
          </div>

          <h1 className="font-serif text-3xl text-[#2D3A30]">Trip Dashboard Incoming</h1>
          <p className="text-stone-500 max-w-md mx-auto leading-relaxed">
            We're setting up the collaborative packing board for trip{' '}
            <span className="font-mono text-[#2D3A30] bg-stone-100 px-1.5 py-0.5 rounded text-sm">
              {tripId}
            </span>
            . Check back soon to claim items and coordinate with your group!
          </p>

          <div className="pt-6">
            <Button
              onClick={() => router.push('/dashboard')}
              className="bg-[#2D3A30] hover:bg-[#1f2821] text-white rounded-full px-8 h-12 transition-all duration-300"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 opacity-40 grayscale pointer-events-none">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 h-48 animate-pulse" />
          <div className="bg-white border border-stone-200 rounded-2xl p-6 h-48 animate-pulse" />
          <div className="bg-white border border-stone-200 rounded-2xl p-6 h-48 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
