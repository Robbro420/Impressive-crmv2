/**
 * Impressive Media-märket: tre stigande staplar med cyan punkt.
 * Ritad som inline-SVG så den skalar skarpt överallt.
 */
export function ImpressiveLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id="impressive-bar" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c6cf5" />
          <stop offset="100%" stopColor="#3f8bf7" />
        </linearGradient>
      </defs>
      <rect x="5" y="29" width="9" height="15" rx="4.5" fill="url(#impressive-bar)" />
      <rect x="19.5" y="20" width="9" height="24" rx="4.5" fill="url(#impressive-bar)" />
      <rect x="34" y="12" width="9" height="32" rx="4.5" fill="url(#impressive-bar)" />
      <circle cx="38.5" cy="5.5" r="4.5" fill="#2fd4f0" />
    </svg>
  )
}
