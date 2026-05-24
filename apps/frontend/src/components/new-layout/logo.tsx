'use client';

export const Logo = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      className="mt-[8px] min-w-[60px] min-h-[60px]"
    >
      <defs>
        <linearGradient id="slimflow-bg" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#612BD3" />
          <stop offset="0.5" stopColor="#D82D7E" />
          <stop offset="1" stopColor="#FC69FF" />
        </linearGradient>
        <linearGradient id="slimflow-s" x1="16" y1="16" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFB86B" />
        </linearGradient>
      </defs>
      
      <rect x="4" y="4" width="52" height="52" rx="14" fill="url(#slimflow-bg)" />
      
      <path
        d="M40 23C40 14 20 14 20 23C20 31 40 31 40 39C40 48 20 48 20 39"
        stroke="url(#slimflow-s)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};
