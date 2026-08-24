/**
 * Impressive-märket — exakt samma SVG som impressivewebb.se:
 * tre stigande staplar i blå gradient med cyan punkt.
 */
export function ImpressiveLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 216" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id="impressive-logo-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="0.5" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="44" y="128" width="38" height="86" rx="19" fill="url(#impressive-logo-g)" />
      <rect x="110" y="85" width="38" height="129" rx="19" fill="url(#impressive-logo-g)" />
      <rect x="176" y="42" width="38" height="172" rx="19" fill="url(#impressive-logo-g)" />
      <circle cx="195" cy="16" r="15" fill="#22d3ee" />
    </svg>
  )
}
