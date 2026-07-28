import { type CSSProperties, type ReactNode } from 'react';

export type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card' | 'table' | 'list' | 'paragraph';
export type SkeletonAnimation = 'pulse' | 'wave' | 'none';

export interface SkeletonProps {
	readonly variant?: SkeletonVariant;
	readonly animation?: SkeletonAnimation;
	readonly width?: string | number;
	readonly height?: string | number;
	readonly textWidth?: string;
	readonly tableRows?: number;
	readonly listItems?: number;
	readonly paragraphLines?: number;
	readonly style?: CSSProperties;
	readonly className?: string;
}

const animStyle: Record<SkeletonAnimation, CSSProperties> = {
	pulse: { animation: 'quenetiq-pulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite' },
	wave: { animation: 'quenetiq-wave 1.6s ease-in-out infinite', background: 'linear-gradient(90deg, var(--quenetiq-skeleton-bg,#e2e8f0) 25%, var(--quenetiq-skeleton-shine,#f1f5f9) 50%, var(--quenetiq-skeleton-bg,#e2e8f0) 75%)', backgroundSize: '200% 100%' },
	none: {},
};

const baseLine = (w = '100%'): CSSProperties => ({
	height: 14, borderRadius: 4, width: w, background: 'var(--quenetiq-skeleton-bg, #e2e8f0)',
});

function SkeletonLine({ w, anim }: { readonly w?: string; readonly anim: SkeletonAnimation }) {
	return <div style={{ ...baseLine(w), ...animStyle[anim] }} />;
}

function SkeletonCard({ anim }: { readonly anim: SkeletonAnimation }) {
	return (
		<div style={{ border: '1px solid var(--quenetiq-skeleton-border, #e2e8f0)', borderRadius: 8, overflow: 'hidden' }}>
			<div style={{ width: '100%', height: 160, background: 'var(--quenetiq-skeleton-bg, #e2e8f0)', ...animStyle[anim] }} />
			<div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
				<SkeletonLine w="70%" anim={anim} />
				<SkeletonLine anim={anim} />
				<SkeletonLine w="50%" anim={anim} />
			</div>
		</div>
	);
}

function SkeletonTable({ rows, anim }: { readonly rows: number; readonly anim: SkeletonAnimation }) {
	return (
		<div style={{ width: '100%' }}>
			{Array.from({ length: rows }, (_, i) => (
				<div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--quenetiq-skeleton-border, #e2e8f0)' }}>
					<div style={{ flex: 1, height: 16, borderRadius: 4, background: 'var(--quenetiq-skeleton-bg, #e2e8f0)', ...animStyle[anim] }} />
					<div style={{ flex: 1, height: 16, borderRadius: 4, background: 'var(--quenetiq-skeleton-bg, #e2e8f0)', ...animStyle[anim] }} />
					<div style={{ flex: 0.5, height: 16, borderRadius: 4, background: 'var(--quenetiq-skeleton-bg, #e2e8f0)', ...animStyle[anim] }} />
				</div>
			))}
		</div>
	);
}

function SkeletonList({ items, anim }: { readonly items: number; readonly anim: SkeletonAnimation }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
			{Array.from({ length: items }, (_, i) => (
				<div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
					<div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--quenetiq-skeleton-bg, #e2e8f0)', ...animStyle[anim] }} />
					<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
						<SkeletonLine w="70%" anim={anim} />
						<SkeletonLine w="50%" anim={anim} />
					</div>
				</div>
			))}
		</div>
	);
}

function SkeletonParagraph({ lines, anim }: { readonly lines: number; readonly anim: SkeletonAnimation }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
			{Array.from({ length: lines }, (_, i) => (
				<SkeletonLine key={i} w={i === lines - 1 ? '60%' : '100%'} anim={anim} />
			))}
		</div>
	);
}

export function Skeleton({
	variant = 'text', animation = 'pulse', width, height, textWidth = '100%',
	tableRows = 5, listItems = 4, paragraphLines = 4, style, className = '',
}: SkeletonProps): ReactNode {
	const wrap: CSSProperties = { borderRadius: 4, overflow: 'hidden', width: width as string | undefined, height: height as string | undefined, ...style };

	const content = (() => {
		switch (variant) {
		case 'text': return <SkeletonLine w={textWidth} anim={animation} />;
		case 'circle': return <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--quenetiq-skeleton-bg, #e2e8f0)', ...animStyle[animation] }} />;
		case 'rect': return <div style={{ width: '100%', height: 120, borderRadius: 4, background: 'var(--quenetiq-skeleton-bg, #e2e8f0)', ...animStyle[animation] }} />;
		case 'card': return <SkeletonCard anim={animation} />;
		case 'table': return <SkeletonTable rows={tableRows} anim={animation} />;
		case 'list': return <SkeletonList items={listItems} anim={animation} />;
		case 'paragraph': return <SkeletonParagraph lines={paragraphLines} anim={animation} />;
		}
	})();

	return (
		<div className={`quenetiq-skeleton ${className}`.trim()} style={wrap} role="status" aria-label="Loading content">
			{content}
			<style>{`
				@keyframes quenetiq-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
				@keyframes quenetiq-wave { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
			`}</style>
		</div>
	);
}
