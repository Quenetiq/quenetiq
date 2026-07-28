import { defineComponent, h, ref, watch, onUnmounted } from 'vue';

export interface RateLimitGateProps {
	isLimited: boolean;
	retryAfter?: number;
	onRetry?: () => void;
	error?: string | null;
}

export const RateLimitGate = defineComponent({
	name: 'RateLimitGate',
	props: {
		isLimited: { type: Boolean, required: true },
		retryAfter: { type: Number, default: undefined },
		onRetry: { type: Function, default: undefined },
		error: { type: String, default: undefined },
	},
	setup(props) {
		const remaining = ref(0);
		let timer: ReturnType<typeof setInterval> | null = null;

		watch(
			() => props.isLimited,
			(limited) => {
				if (timer) {
					clearInterval(timer);
					timer = null;
				}
				if (!limited) {
					remaining.value = 0;
					return;
				}
				const total = props.retryAfter ?? 5000;
				remaining.value = total;
				const start = Date.now();
				timer = setInterval(() => {
					const left = Math.max(0, total - (Date.now() - start));
					remaining.value = left;
					if (left <= 0) {
						if (timer) {
							clearInterval(timer);
							timer = null;
						}
						props.onRetry?.();
					}
				}, 100);
			},
		);

		onUnmounted(() => {
			if (timer) clearInterval(timer);
		});

		return { remaining };
	},
	render() {
		if (!this.isLimited) return this.$slots['default']?.();

		const defaultFallback = h(
			'div',
			{
				style: {
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					padding: '2rem',
					borderRadius: '8px',
					backgroundColor: '#fff5f5',
					border: '1px solid #fecaca',
					color: '#991b1b',
					fontFamily: 'system-ui, sans-serif',
				},
			},
			[
				h(
					'svg',
					{
						width: 40,
						height: 40,
						viewBox: '0 0 24 24',
						fill: 'none',
						stroke: 'currentColor',
						strokeWidth: 2,
						strokeLinecap: 'round',
						strokeLinejoin: 'round',
						style: { marginBottom: '8px' },
					},
					[h('circle', { cx: 12, cy: 12, r: 10 }), h('path', { d: 'M12 8v4M12 16h.01' })],
				),
				h('p', { style: { margin: '0 0 4px', fontWeight: 600, fontSize: '16px' } }, 'Rate limit exceeded'),
				this.error ? h('p', { style: { margin: '0 0 8px', fontSize: '13px', opacity: 0.8 } }, this.error) : null,
				h('p', { style: { margin: 0, fontSize: '14px' } }, [
					'Retry in ',
					h('strong', null, `${Math.ceil(this.remaining / 1000)}s`),
				]),
			],
		);

		return this.$slots['fallback']?.() ?? defaultFallback;
	},
});
