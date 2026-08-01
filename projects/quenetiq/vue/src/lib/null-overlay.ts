import { defineComponent, h, ref, watch } from 'vue';
import { useEpicFetus } from './use-epic-fetus';

export const NullOverlay = defineComponent({
	name: 'NullOverlay',
	setup() {
		const event = useEpicFetus();
		const visible = ref(false);
		let timer: ReturnType<typeof setTimeout> | null = null;

		watch(event, (val) => {
			if (timer) clearTimeout(timer);
			if (val) {
				visible.value = true;
				timer = setTimeout(() => {
					visible.value = false;
					timer = null;
				}, 6000);
			} else {
				visible.value = false;
			}
		});

		return { event, visible };
	},
	render() {
		if (!this.visible || !this.event) return null;

		const isNull = this.event.type === 'null-value';
		const title = isNull ? 'NULL DETECTED' : 'У ВАС ОШИБКА В КВЕРИ';
		const message = isNull ? (this.event.path ?? 'unknown') : this.event.message;

		return h(
			'div',
			{
				style: {
					position: 'fixed',
					inset: '0',
					zIndex: 99999,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					background: isNull ? 'rgba(0,0,0,0.92)' : 'rgba(80,0,0,0.92)',
				},
			},
			[
				h('div', { style: { textAlign: 'center' } }, [
					h('div', { style: { fontSize: '6rem', marginBottom: '1rem' } }, [
						isNull
							? h(
								'span',
								{ style: { color: '#ff0', textShadow: '0 0 20px #ff0, 0 0 40px #ff0, 0 0 80px #f80' } },
								'\u2205',
							)
							: h(
								'span',
								{ style: { color: '#f44', textShadow: '0 0 20px #f44, 0 0 40px #f44, 0 0 80px #a00' } },
								'\u26A0',
							),
					]),
					h(
						'div',
						{
							style: Object.assign(
								{
									fontSize: '3rem',
									fontWeight: 900,
									letterSpacing: '0.15em',
									marginBottom: '.75rem',
									textTransform: 'uppercase',
								},
								isNull
									? { color: '#ff0', textShadow: '0 0 20px #ff0, 4px 0 rgba(255,0,0,0.5), -4px 0 rgba(0,0,255,0.5)' }
									: { color: '#f44', textShadow: '0 0 20px #f44, 4px 0 rgba(255,255,0,0.5), -4px 0 rgba(255,0,0,0.5)' },
							),
						},
						title,
					),
					h(
						'div',
						{
							style: {
								fontSize: '1.25rem',
								color: 'rgba(255,255,255,0.7)',
								fontFamily: 'monospace',
								marginBottom: '1rem',
								whiteSpace: 'pre-wrap',
								wordBreak: 'break-all',
							},
						},
						message,
					),
					h(
						'div',
						{
							style: {
								fontSize: '.85rem',
								color: 'rgba(255,255,255,0.4)',
								letterSpacing: '.3em',
								textTransform: 'uppercase',
							},
						},
						'THE DATA IS CORRUPTED',
					),
				]),
			],
		);
	},
});
