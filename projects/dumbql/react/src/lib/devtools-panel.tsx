import { useState, useCallback } from 'react';
import type { QueryLogEntry } from '@dumbql/client';

export interface DevToolsPanelProps {
	readonly getLog: () => QueryLogEntry[];
	readonly clearLog: () => void;
	readonly isOpen?: boolean;
	readonly onToggle?: (open: boolean) => void;
	readonly position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
	readonly maxEntries?: number;
}

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
	return str.length > max ? str.slice(0, max) + '...' : str;
}

const positionStyles: Record<string, React.CSSProperties> = {
	'bottom-right': { bottom: 0, right: 0 },
	'bottom-left': { bottom: 0, left: 0 },
	'top-right': { top: 0, right: 0 },
	'top-left': { top: 0, left: 0 },
};

export function DevToolsPanel({
	getLog,
	clearLog,
	isOpen: controlledOpen,
	onToggle,
	position = 'bottom-right',
	maxEntries = 50,
}: DevToolsPanelProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const [selectedEntry, setSelectedEntry] = useState<QueryLogEntry | null>(null);
	const [filter, setFilter] = useState<'all' | 'query' | 'mutation'>('all');

	const isOpen = controlledOpen ?? internalOpen;
	const toggle = useCallback(() => {
		const next = !isOpen;
		setInternalOpen(next);
		onToggle?.(next);
	}, [isOpen, onToggle]);

	const entries = getLog().filter((e) => filter === 'all' || e.type === filter).slice(0, maxEntries);

	const posStyle = positionStyles[position] ?? positionStyles['bottom-right'];

	return (
		<>
			<button
				onClick={toggle}
				style={{
					position: 'fixed',
					...posStyle,
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
				}}
			>
				{isOpen ? 'X' : 'QL'}
			</button>

			{isOpen && (
				<div
					style={{
						position: 'fixed',
						...posStyle,
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
					}}
				>
					<div style={{ padding: '8px 12px', borderBottom: '1px solid #30363d', display: 'flex', gap: '8px', alignItems: 'center' }}>
						<span style={{ fontWeight: 'bold' }}>DumbQL DevTools</span>
						<select
							value={filter}
							onChange={(e) => setFilter(e.target.value as 'all' | 'query' | 'mutation')}
							style={{ background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '3px', padding: '2px 4px', fontSize: '11px' }}
						>
							<option value="all">All</option>
							<option value="query">Queries</option>
							<option value="mutation">Mutations</option>
						</select>
						<button
							onClick={clearLog}
							style={{ marginLeft: 'auto', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer', fontSize: '11px' }}
						>
							Clear
						</button>
					</div>

					<div style={{ flex: 1, overflow: 'auto' }}>
						{entries.length === 0 && (
							<div style={{ padding: '12px', color: '#8b949e', textAlign: 'center' }}>
								No queries yet
							</div>
						)}
						{entries.map((entry) => (
							<div
								key={entry.id}
								onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
								style={{
									padding: '6px 12px',
									borderBottom: '1px solid #21262d',
									cursor: 'pointer',
									background: selectedEntry?.id === entry.id ? '#161b22' : 'transparent',
								}}
							>
								<div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
									<span style={{
										padding: '1px 4px',
										borderRadius: '3px',
										fontSize: '9px',
										fontWeight: 'bold',
										textTransform: 'uppercase',
										background: entry.type === 'mutation' ? '#da3633' : '#1f6feb',
										color: '#fff',
									}}>
										{entry.type === 'mutation' ? 'MUT' : 'QRY'}
									</span>
									<span style={{ color: entry.status === 'error' ? '#f85149' : '#8b949e' }}>
										{entry.operationName ?? truncate(entry.query, 40)}
									</span>
									<span style={{ marginLeft: 'auto', color: entry.durationMs > 100 ? '#f0883e' : '#8b949e' }}>
										{formatDuration(entry.durationMs)}
									</span>
									{entry.fromCache && (
										<span style={{ color: '#3fb950', fontSize: '9px' }}>CACHE</span>
									)}
								</div>
								{selectedEntry?.id === entry.id && (
									<div style={{ marginTop: '6px', padding: '6px', background: '#161b22', borderRadius: '3px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '10px', lineHeight: '1.5' }}>
										<div><span style={{ color: '#8b949e' }}>Type:</span> {entry.type}</div>
										<div><span style={{ color: '#8b949e' }}>Status:</span> <span style={{ color: entry.status === 'error' ? '#f85149' : '#3fb950' }}>{entry.status}</span></div>
										<div><span style={{ color: '#8b949e' }}>Duration:</span> {formatDuration(entry.durationMs)}</div>
										<div><span style={{ color: '#8b949e' }}>Size:</span> {formatSize(entry.size)}</div>
										<div><span style={{ color: '#8b949e' }}>Time:</span> {new Date(entry.timestamp).toLocaleTimeString()}</div>
										{entry.error && <div style={{ color: '#f85149' }}>Error: {entry.error}</div>}
										<div style={{ marginTop: '4px' }}><span style={{ color: '#8b949e' }}>Query:</span></div>
										<div style={{ color: '#79c0ff' }}>{truncate(entry.query, 300)}</div>
										{entry.variables && (
											<>
												<div style={{ marginTop: '4px' }}><span style={{ color: '#8b949e' }}>Variables:</span></div>
												<div style={{ color: '#7ee787' }}>{JSON.stringify(entry.variables, null, 2)}</div>
											</>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</>
	);
}
