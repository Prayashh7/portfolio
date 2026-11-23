/*
  Service icons. The icon name is a column in the database, so the set of shapes
  it can resolve to lives here. An unknown name falls back to the mark rather
  than leaving a gap.
*/

const ICONS = {
  layers: (
    <>
      <path d="M12 2.5 2.5 7.5l9.5 5 9.5-5-9.5-5Z" />
      <path d="M2.5 12.5 12 17.5l9.5-5" />
      <path d="M2.5 17 12 22l9.5-5" />
    </>
  ),
  monitor: (
    <>
      <rect x="2.5" y="3.5" width="19" height="13" rx="1.5" />
      <path d="M8 20.5h8M12 16.5v4" />
    </>
  ),
  server: (
    <>
      <rect x="2.5" y="3.5" width="19" height="7" rx="1.5" />
      <rect x="2.5" y="13.5" width="19" height="7" rx="1.5" />
      <path d="M6 7h.01M6 17h.01" />
    </>
  ),
  orbit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-24 12 12)" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
};

export default function Icon({ name, className = "icon" }) {
  const shape = ICONS[name] ?? ICONS.spark;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shape}
    </svg>
  );
}
