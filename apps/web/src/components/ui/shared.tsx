// ── Avatar ──
export function Avatar({
  name,
  size = 'md',
  url,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  url?: string | null;
}) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-12 h-12 text-base',
  };

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-[#D6E7EF] flex items-center justify-center font-medium text-[#2A3F4E]`}>
      {initials}
    </div>
  );
}

// ── Spinner ──
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-[#4B7B9C]"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Loading ──
export function Loading({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Spinner size={24} />
      <span className="text-sm text-gray-400">{text}</span>
    </div>
  );
}

// ── Empty State ──
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-gray-300 mb-3">{icon}</div>
      <p className="text-gray-500 font-medium text-sm">{title}</p>
      {description && <p className="text-gray-400 text-xs mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Badge ──
export function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}) {
  const colors = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-sky-100 text-sky-700',
    purple: 'bg-[#D6E7EF] text-[#2A3F4E]',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[variant]}`}>
      {children}
    </span>
  );
}

// ── Progress Bar ──
export function ProgressBar({
  value,
  height = 6,
  color = 'bg-[#4B7B9C]',
  className = '',
}: {
  value: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${className}`} style={{ height }}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ── Confirm Dialog (simple) ──
export function ConfirmButton({
  onConfirm,
  children,
  confirmText = 'Tem certeza?',
  className = '',
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
}) {
  const handleClick = () => {
    if (window.confirm(confirmText)) onConfirm();
  };

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
