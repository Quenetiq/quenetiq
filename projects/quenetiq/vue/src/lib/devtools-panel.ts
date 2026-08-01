import { defineComponent, ref, computed, h, type PropType, type CSSProperties } from 'vue';
import type { QueryLogEntry } from '@quenetiq/client';

function formatDuration(ms: number): string {
	if (ms < 1) return '<1ms';
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	return `${(bytes / 1024).toFixed(1)}KB`;
}

function truncate(str: string, max: number): string {
	return str.length > max ? `${str.slice(0, max)  }...` : str;
}

const panelStyle: CSSProperties = {
	position: 'fixed',
	zIndex: 99998,
	width: '420px',
	maxHeight: '50vh',
	background: '#0d1117',
	color: '#c9d1d9',
	border: '1px solid #30363d',
	borderRadius: '6px',
	fontFamily: 'monospace',
	fontSize: '11px',
	overflow: 'hidden',
	display: 'flex',
	flexDirection: 'column',
	margin: '8px',
};

const btnStyle: CSSProperties = {
	position: 'fixed',
	zIndex: 99999,
	margin: '8px',
	padding: '6px 10px',
	background: '#1a1a2e',
	color: '#e0e0e0',
	border: '1px solid #333',
	borderRadius: '4px',
	cursor: 'pointer',
	fontFamily: 'monospace',
	fontSize: '12px',
};

const selectStyle: CSSProperties = {
	background: '#161b22',
	color: '#c9d1d9',
	border: '1px solid #30363d',
	borderRadius: '3px',
	padding: '2px 4px',
	fontSize: '11px',
};

const clearBtnStyle: CSSProperties = {
	marginLeft: 'auto',
	background: '#21262d',
	color: '#c9d1d9',
	border: '1px solid #30363d',
	borderRadius: '3px',
	padding: '2px 6px',
	cursor: 'pointer',
	fontSize: '11px',
};

function posStyle(position: string): CSSProperties {
	switch (position) {
	case 'bottom-left': return { bottom: 0, left: 0 };
	case 'top-right': return { top: 0, right: 0 };
	case 'top-left': return { top: 0, left: 0 };
	default: return { bottom: 0, right: 0 };
	}
}

export const DevToolsPanel = defineComponent({
	name: 'DevToolsPanel',
	props: {
		getLog: {
			type: Function as PropType<() => QueryLogEntry[]>,
			required: true,
		},
		clearLog: {
			type: Function as PropType<() => void>,
			required: true,
		},
		isOpen: {
			type: Boolean,
			default: undefined,
		},
		onToggle: {
			type: Function as PropType<(open: boolean) => void>,
			default: undefined,
		},
		position: {
			type: String as PropType<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>,
			default: 'bottom-right',
		},
		maxEntries: {
			type: Number,
			default: 50,
		},
	},
	setup(props) {
		const internalOpen = ref(false);
		const selectedEntry = ref<QueryLogEntry | null>(null);
		const filter = ref<'all' | 'query' | 'mutation'>('all');

		const isOpen = computed(() => props.isOpen ?? internalOpen.value);

		function toggle(): void {
			const next = !isOpen.value;
			internalOpen.value = next;
			props.onToggle?.(next);
		}

		const entries = computed(() =>
			props.getLog()
				.filter((e) => filter.value === 'all' || e.type === filter.value)
				.slice(0, props.maxEntries),
		);

		function toggleEntry(entry: QueryLogEntry): void {
			selectedEntry.value = selectedEntry.value?.id === entry.id ? null : entry;
		}

		return () => {
			const pos = posStyle(props.position);

			const toggleBtn = h('button', {
				onClick: toggle,
				style: { ...btnStyle, ...pos },
			}, isOpen.value ? 'X' : 'QL');

			if (!isOpen.value) return toggleBtn;

			const header = h('div', {
				style: {
					padding: '8px 12px', borderBottom: '1px solid #30363d',
					display: 'flex', gap: '8px', alignItems: 'center',
				},
			}, [
				h('span', { style: { fontWeight: 'bold' } }, 'Quenetiq DevTools'),
				h('select', {
					value: filter.value,
					onChange: (e: Event) => {
						const val = (e.target as HTMLSelectElement).value;
						filter.value = val as typeof filter.value;
					},
					style: selectStyle,
				}, [
					h('option', { value: 'all' }, 'All'),
					h('option', { value: 'query' }, 'Queries'),
					h('option', { value: 'mutation' }, 'Mutations'),
				]),
				h('button', {
					onClick: props.clearLog,
					style: clearBtnStyle,
				}, 'Clear'),
			]);

			const emptyMsg = entries.value.length === 0
				? h('div', { style: { padding: '12px', color: '#8b949e', textAlign: 'center' } }, 'No queries yet')
				: null;

			const entryItems = entries.value.map((entry) => {
				const isSelected = selectedEntry.value?.id === entry.id;

				const badge = h('span', {
					style: {
						padding: '1px 4px',
						borderRadius: '3px',
						fontSize: '9px',
						fontWeight: 'bold',
						textTransform: 'uppercase',
						background: entry.type === 'mutation' ? '#da3633' : '#1f6feb',
						color: '#fff',
					},
				}, entry.type === 'mutation' ? 'MUT' : 'QRY');

				const name = h('span', {
					style: { color: entry.status === 'error' ? '#f85149' : '#8b949e' },
				}, entry.operationName ?? truncate(entry.query, 40));

				const duration = h('span', {
					style: { marginLeft: 'auto', color: entry.durationMs > 100 ? '#f0883e' : '#8b949e' },
				}, formatDuration(entry.durationMs));

				const cacheBadge = entry.fromCache
					? h('span', { style: { color: '#3fb950', fontSize: '9px' } }, 'CACHE')
					: null;

				const summary = h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [badge, name, duration, cacheBadge]);

				const details = isSelected ? h('div', {
					style: { marginTop: '6px', padding: '6px', background: '#161b22', borderRadius: '3px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '10px', lineHeight: '1.5' },
				}, [
					h('div', [h('span', { style: { color: '#8b949e' } }, 'Type: '), entry.type]),
					h('div', [h('span', { style: { color: '#8b949e' } }, 'Status: '), h('span', { style: { color: entry.status === 'error' ? '#f85149' : '#3fb950' } }, entry.status)]),
					h('div', [h('span', { style: { color: '#8b949e' } }, 'Duration: '), formatDuration(entry.durationMs)]),
					h('div', [h('span', { style: { color: '#8b949e' } }, 'Size: '), formatSize(entry.size)]),
					h('div', [h('span', { style: { color: '#8b949e' } }, 'Time: '), new Date(entry.timestamp).toLocaleTimeString()]),
					entry.error ? h('div', { style: { color: '#f85149' } }, `Error: ${entry.error}`) : null,
					h('div', { style: { marginTop: '4px' } }, [h('span', { style: { color: '#8b949e' } }, 'Query:')]),
					h('div', { style: { color: '#79c0ff' } }, truncate(entry.query, 300)),
					entry.variables ? [
						h('div', { style: { marginTop: '4px' } }, [h('span', { style: { color: '#8b949e' } }, 'Variables:')]),
						h('div', { style: { color: '#7ee787' } }, JSON.stringify(entry.variables, null, 2)),
					] : null,
				]) : null;

				return h('div', {
					key: entry.id,
					onClick: () => toggleEntry(entry),
					style: { padding: '6px 12px', borderBottom: '1px solid #21262d', cursor: 'pointer', background: isSelected ? '#161b22' : 'transparent' },
				}, [summary, details]);
			});

			const list = h('div', { style: { flex: 1, overflow: 'auto' } }, [emptyMsg, ...entryItems]);

			const panel = h('div', { style: { ...panelStyle, ...pos } }, [header, list]);

			return h('div', null, [toggleBtn, panel]);
		};
	},
});
