'use client';

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const config: Record<string, { dim: number; fs: number; radius: number }> = {
  xs: { dim: 20, fs: 7, radius: 6 },
  sm: { dim: 28, fs: 9, radius: 8 },
  md: { dim: 32, fs: 10, radius: 9 },
  lg: { dim: 56, fs: 18, radius: 12 },
};

const palette = [
  { bg: '#e0e7ff', fg: '#4338ca' },
  { bg: '#d1fae5', fg: '#065f46' },
  { bg: '#fef3c7', fg: '#92400e' },
  { bg: '#fce7f3', fg: '#9d174d' },
  { bg: '#dbeafe', fg: '#1e40af' },
  { bg: '#fde8e8', fg: '#991b1b' },
  { bg: '#e0f2fe', fg: '#075985' },
  { bg: '#f3e8ff', fg: '#6b21a8' },
];

function pickColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

export function Avatar({ src, firstName, lastName, size = 'sm', className = '' }: AvatarProps) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;
  const c = config[size];
  const color = pickColor(`${firstName}${lastName}`);

  const base: React.CSSProperties = {
    width: c.dim, height: c.dim, borderRadius: c.radius, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  };

  if (src) {
    return (
      <div style={base} className={className}>
        <img src={src} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  return (
    <div style={{ ...base, background: color.bg, color: color.fg, fontSize: c.fs, fontWeight: 500 }} className={className}>
      {initials}
    </div>
  );
}
