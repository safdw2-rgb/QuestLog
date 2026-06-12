interface MapTabIconProps {
  className?: string;
}

export function MapTabIcon({ className = "h-5 w-5" }: MapTabIconProps) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 6.5L9 4.5L15 6.5L21 4.5V17.5L15 19.5L9 17.5L3 19.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 4.5V17.5M15 6.5V19.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="1.6" fill="currentColor" />
    </svg>
  );
}
