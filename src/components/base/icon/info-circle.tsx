interface InfoCircleIconProps {
  className?: string;
}

export function InfoCircleIcon({ className }: InfoCircleIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 16 16"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="8" cy="8" r="8" />
      <circle cx="8" cy="4.6" r="1" fill="var(--surface-overlay)" />
      <rect x="7.1" y="6.6" width="1.8" height="5.4" rx=".9" fill="var(--surface-overlay)" />
    </svg>
  );
}
