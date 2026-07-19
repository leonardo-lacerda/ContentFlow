'use client';

/** Editorial brand mark — ink square + amber accent (landing DS). */
export const Logo = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      className="min-w-[40px] min-h-[40px] w-[40px] h-[40px] shrink-0 mx-auto group-hover/sidebar:mx-0 transition-[margin] duration-200"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="11" fill="#1c1917" />
      <rect x="22" y="10" width="8" height="8" rx="2" fill="#b4530a" />
      <path
        d="M12 14.5C12 11.5 18.5 10.5 22 13.5C25.5 16.5 14.5 19 14.5 23.5C14.5 28 24 28.5 28 25"
        stroke="#fafaf9"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};
