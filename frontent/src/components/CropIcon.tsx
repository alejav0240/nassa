interface CropIconProps {
  crop: string;
  size?: number;
  className?: string;
}

export function CropIcon({ crop, size = 28, className = '' }: CropIconProps) {
  const normalized = crop.toLowerCase();
  const isRoot = normalized === 'papa';
  const isGrain = ['cebada', 'avena', 'quinua'].includes(normalized);
  const isLegume = ['haba', 'tarwi'].includes(normalized);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`Ícono de ${crop}`}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="23" fill="currentColor" opacity="0.12" />
      <path d="M24 38V17" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      {isRoot && (
        <>
          <path d="M24 17C18 10 11 13 10 19c6 2 10 1 14-2Z" fill="currentColor" opacity="0.75" />
          <path d="M24 30c-8-2-12 3-10 8 6 1 10-2 10-8Z" fill="currentColor" opacity="0.9" />
          <path d="M24 30c8-2 12 3 10 8-6 1-10-2-10-8Z" fill="currentColor" opacity="0.65" />
          <circle cx="24" cy="39" r="4" fill="currentColor" />
        </>
      )}
      {isGrain && (
        <>
          <path d="M24 17C19 13 18 8 20 6M24 20C30 15 32 10 30 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M20 11h-5M20 15h-6M29 11h5M28 15h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M18 38c3-7 9-7 12 0" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {isLegume && (
        <>
          <path d="M24 22c-9-8-15-3-13 4 5 3 10 1 13-4Z" fill="currentColor" opacity="0.7" />
          <path d="M24 27c9-8 15-3 13 4-5 3-10 1-13-4Z" fill="currentColor" opacity="0.55" />
          <path d="M19 34c4-5 9-5 13 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </>
      )}
      {!isRoot && !isGrain && !isLegume && (
        <path d="M24 19c-8-7-14-2-12 5 5 2 10 0 12-5ZM24 27c8-7 14-2 12 5-5 2-10 0-12-5Z" fill="currentColor" opacity="0.7" />
      )}
    </svg>
  );
}
