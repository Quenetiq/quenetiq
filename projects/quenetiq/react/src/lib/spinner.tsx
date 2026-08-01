import { type CSSProperties, type ReactNode } from 'react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'primary' | 'accent' | 'warn' | 'inherit';

export interface SpinnerProps {
	readonly size?: SpinnerSize;
	readonly color?: SpinnerColor;
	readonly label?: string;
	readonly showLabel?: boolean;
	readonly style?: CSSProperties;
	readonly className?: string;
}

const sizeMap: Record<SpinnerSize, number> = { xs: 14, sm: 18, md: 28, lg: 40, xl: 56 };

export function Spinner({ size = 'md', color = 'primary', label = 'Loading...', showLabel = false, style, className = '' }: SpinnerProps): ReactNode {
	const px = sizeMap[size];
	return (
		<div
			className={`quenetiq-spinner quenetiq-spinner--${color} ${className}`.trim()}
			style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8, ...style }}
			role="status"
			aria-label="Loading"
		>
			<svg width={px} height={px} viewBox="0 0 50 50" style={{ animation: 'quenetiq-spin 0.8s linear infinite' }}>
				<circle
					className={`quenetiq-spinner__circle quenetiq-spinner__circle--${color}`}
					cx="25" cy="25" r="20"
					fill="none" stroke="currentColor" strokeWidth="4"
					strokeLinecap="round"
					style={{ strokeDasharray: '90, 150', strokeDashoffset: 0, animation: 'quenetiq-dash 1.4s ease-in-out infinite' }}
				/>
			</svg>
			{showLabel && <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>}
			<style>{`
				@keyframes quenetiq-spin { 100% { transform: rotate(360deg); } }
				@keyframes quenetiq-dash {
					0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
					50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
					100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
				}
				.quenetiq-spinner__circle--primary { stroke: var(--quenetiq-primary, #3b82f6); }
				.quenetiq-spinner__circle--accent { stroke: var(--quenetiq-accent, #8b5cf6); }
				.quenetiq-spinner__circle--warn { stroke: var(--quenetiq-warn, #ef4444); }
				.quenetiq-spinner__circle--inherit { stroke: currentColor; }
			`}</style>
		</div>
	);
}
