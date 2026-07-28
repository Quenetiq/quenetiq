import { useState, useEffect, type ReactNode } from 'react';

export interface RateLimitGateProps {
  /** Whether the rate limit has been exceeded */
  isLimited: boolean;
  /** Children to render when not rate limited */
  children: ReactNode;
  /** Custom fallback UI when rate limited */
  fallback?: ReactNode;
  /** Retry-After duration in milliseconds (default: auto-calculated from error if not provided) */
  retryAfter?: number;
  /** Optional callback when countdown completes */
  onRetry?: () => void;
  /** Optional error message to display */
  error?: string | null;
}

export function RateLimitGate({
  isLimited,
  children,
  fallback,
  retryAfter,
  onRetry,
  error,
}: RateLimitGateProps): ReactNode {
  const [remaining, setRemaining] = useState(retryAfter ?? 0);

  useEffect(() => {
    if (!isLimited) {
      setRemaining(0);
      return;
    }

    const total = retryAfter ?? 5000;
    setRemaining(total);

    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, total - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        onRetry?.();
      }
    }, 100);

    return () => clearInterval(id);
  }, [isLimited, retryAfter, onRetry]);

  if (!isLimited) return children;

  if (fallback !== undefined) return fallback;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        borderRadius: 8,
        backgroundColor: '#fff5f5',
        border: '1px solid #fecaca',
        color: '#991b1b',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginBottom: 8 }}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 16 }}>
        Rate limit exceeded
      </p>
      {error && (
        <p style={{ margin: '0 0 8px', fontSize: 13, opacity: 0.8 }}>{error}</p>
      )}
      <p style={{ margin: 0, fontSize: 14 }}>
        Retry in <strong>{Math.ceil(remaining / 1000)}s</strong>
      </p>
    </div>
  );
}
