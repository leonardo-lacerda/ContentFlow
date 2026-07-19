import React from 'react';

/** Wordmark + editorial mark (ink + amber). */
export const LogoTextComponent = () => {
  return (
    <svg
      width="168"
      height="33"
      viewBox="0 0 168 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ContentFlow"
    >
      <rect x="0" y="3.5" width="26" height="26" rx="7" fill="#1c1917" />
      <rect x="14" y="9" width="6" height="6" rx="1.5" fill="#b4530a" />
      <path
        d="M7.5 13C7.5 10.5 13 9.8 15.5 12C18 14.2 9.5 16.2 9.5 19.5C9.5 22.8 16.5 23.2 19.5 20.5"
        stroke="#fafaf9"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <text
        x="34"
        y="24"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="18"
        fill="currentColor"
        letterSpacing="-0.02em"
      >
        ContentFlow
      </text>
    </svg>
  );
};
