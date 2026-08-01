import { type CSSProperties, type ReactNode } from 'react';

export type DotsSize = 'sm' | 'md' | 'lg';
export type DotsColor = 'primary' | 'accent' | 'warn' | 'inherit';

export interface DotsProps {
	readonly size?: DotsSize;
	readonly color?: DotsColor;
	readonly label?: string;
	readonly showLabel?: boolean;
	readonly style?: CSSProperties;
	readonly className?: string;
}

const dotPx: Record<DotsSize, number> = { sm: 6, md: 10, lg: 14 };

export function Dots({ size = 'md', color = 'primary', label = 'Loading', showLabel = false, style, className = '' }: DotsProps): ReactNode {
	const px = dotPx[size];
	const dotStyle: CSSProperties = { width: px, height: px, borderRadius: '50%' };
	return (
		<div
			className={`quenetiq-dots quenetiq-dots--${color} ${className}`.trim()}
			style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}
			role="status"
			aria-label="Loading"
		>
			{[0, 1, 2].map((i) => (
				<span
					key={i}
					className={`quenetiq-dots__dot quenetiq-dots__dot--${color}`}
					style={{ ...dotStyle, animation: `quenetiq-bounce 1.4s infinite ease-in-out both`, animationDelay: `${-0.32 + i * 0.16}s` }}
				/>
			))}
			{showLabel && <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>{label}</span>}
			<style>{`
				@keyframes quenetiq-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
				.quenetiq-dots__dot--primary { background: var(--quenetiq-primary, #3b82f6); }
				.quenetiq-dots__dot--accent { background: var(--quenetiq-accent, #8b5cf6); }
				.quenetiq-dots__dot--warn { background: var(--quenetiq-warn, #ef4444); }
				.quenetiq-dots__dot--inherit { background: currentColor; }
			`}</style>
		</div>
	);
}
