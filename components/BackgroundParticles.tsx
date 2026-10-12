'use client';

import React from 'react';

export const BackgroundParticles: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div
        className="absolute left-[12%] top-[14%] h-1.5 w-1.5 animate-pulse rounded-full bg-[#4f3f35]/25"
        style={{ animationDelay: '0s', animationDuration: '4s' }}
      />
      <div
        className="absolute left-[82%] top-[22%] h-2 w-2 animate-pulse rounded-full bg-[#4f3f35]/20"
        style={{ animationDelay: '1s', animationDuration: '5s' }}
      />
      <div
        className="absolute left-[28%] top-[68%] h-1.5 w-1.5 animate-pulse rounded-full bg-[#4f3f35]/25"
        style={{ animationDelay: '2s', animationDuration: '3.5s' }}
      />
      <div
        className="absolute left-[68%] top-[78%] h-2 w-2 animate-pulse rounded-full bg-[#4f3f35]/15"
        style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}
      />
      <div
        className="absolute left-[48%] top-[8%] h-1 w-1 animate-pulse rounded-full bg-[#4f3f35]/20"
        style={{ animationDelay: '3s', animationDuration: '5s' }}
      />
      <div
        className="absolute left-[88%] top-[52%] h-1.5 w-1.5 animate-pulse rounded-full bg-[#4f3f35]/25"
        style={{ animationDelay: '1.5s', animationDuration: '4s' }}
      />
      <div
        className="absolute left-[6%] top-[85%] h-2 w-2 animate-pulse rounded-full bg-[#4f3f35]/15"
        style={{ animationDelay: '2.5s', animationDuration: '4.2s' }}
      />
    </div>
  );
};
