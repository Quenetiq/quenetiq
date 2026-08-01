import { type CSSProperties, type ReactNode } from 'react';

export type ProgressColor = 'primary' | 'accent' | 'warn' | 'success' | 'inherit';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressProps {
	readonly value?: number;
	readonly color?: ProgressColor;
	readonly size?: ProgressSize;
	readonly width?: string;
	readonly showLabel?: boolean;
	readonly indeterminate?: boolean;
	readonly style?: CSSProperties;
	readonly className?: string;
}

const sizeH: Record<ProgressSize, number> = { sm: 4, md: 8, lg: 14 };

export function Progress({
	value = 0, color = 'primary', size = 'md', width, showLabel = false,
	indeterminate = false, style, className = '',
}: ProgressProps): ReactNode {
	const fillStyle: CSSProperties = indeterminate
		? { width: '100%', animation: 'quenetiq-indeterminate 1.8s ease-in-out infinite', transformOrigin: 'left' }
		: { width: `${Math.min(100, Math.max(0, value))}%`, transition: 'width 0.3s ease' };

	return (
		<div
			className={`quenetiq-progress quenetiq-progress--${color} ${className}`.trim()}
			style={{ display: 'inline-flex', alignItems: 'center', gap: 10, width, ...style }}
			role="progressbar"
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<div style={{ flex: 1, borderRadius: 999, overflow: 'hidden', background: 'var(--quenetiq-progress-track, #e2e8f0)', height: sizeH[size] }}>
				<div className={`quenetiq-progress__fill quenetiq-progress__fill--${color}`} style={fillStyle} />
			</div>
			{showLabel && <span style={{ fontSize: size === 'sm' ? 10 : 12, minWidth: 32, textAlign: 'right', opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>{value}%</span>}
			<style>{`
				@keyframes quenetiq-indeterminate { 0% { transform: translateX(-100%) scaleX(0.3); } 50% { transform: translateX(30%) scaleX(0.6); } 100% { transform: translateX(100%) scaleX(0.3); } }
				.quenetiq-progress__fill { height: 100%; border-radius: 999px; }
				.quenetiq-progress__fill--primary { background: var(--quenetiq-primary, #3b82f6); }
				.quenetiq-progress__fill--accent { background: var(--quenetiq-accent, #8b5cf6); }
				.quenetiq-progress__fill--warn { background: var(--quenetiq-warn, #ef4444); }
				.quenetiq-progress__fill--success { background: var(--quenetiq-success, #22c55e); }
				.quenetiq-progress__fill--inherit { background: currentColor; }
			`}</style>
		</div>
	);
}
