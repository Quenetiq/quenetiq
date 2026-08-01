export interface DiffEntry {
	/** Timestamp of the diff */
	timestamp: number;
	/** Query name or hash */
	query: string;
	/** Fields that changed */
	changedFields: string[];
	/** Previous data snapshot */
	previousData: unknown;
	/** New data snapshot */
	newData: unknown;
}

/**
 * Response diff logging middleware. Logs changes between consecutive responses
 * for the same query. Useful for debugging and performance monitoring.
 *
 * @example
 * ```typescript
 * const logs: DiffEntry[] = [];
 * const middleware = responseDiffLogging({ onDiff: (entry) => logs.push(entry) });
 * ```
 */
export function responseDiffLogging(config?: {
	/** Callback when a diff is detected */
	onDiff?: (entry: DiffEntry) => void;
	/** Whether to log to console. Default: true */
	console?: boolean;
	/** Custom key function. Default: query string hash */
	keyFn?: (query: string, variables?: Record<string, unknown>) => string;
}): (entry: DiffEntry) => void {
	const enabled = config?.console ?? true;
	const onDiff = config?.onDiff;
	const keyFn = config?.keyFn;

	const previousResults = new Map<string, unknown>();

	return (entry: DiffEntry): void => {
		const key = keyFn ? keyFn(entry.query) : entry.query;
		const prev = previousResults.get(key);

		if (prev !== undefined) {
			const diffs = deepDiff(prev, entry.newData);
			if (diffs.length > 0) {
				entry.changedFields = diffs;
				entry.previousData = prev;
				previousResults.set(key, entry.newData);

				if (onDiff) onDiff(entry);
				if (enabled) {
					// eslint-disable-next-line no-console
					console.log(
						`[Quenetiq Diff] ${entry.query}:`,
						diffs.join(', '),
						{ previous: entry.previousData, current: entry.newData },
					);
				}
			}
		} else {
			previousResults.set(key, entry.newData);
		}
	};
}

function deepDiff(a: unknown, b: unknown, prefix = ''): string[] {
	if (a === b) return [];
	if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
		return a !== b ? [prefix || 'root'] : [];
	}

	const diffs: string[] = [];
	const keysA = Object.keys(a as Record<string, unknown>);
	const keysB = Object.keys(b as Record<string, unknown>);
	const allKeys = new Set([...keysA, ...keysB]);

	for (const key of allKeys) {
		const path = prefix ? `${prefix}.${key}` : key;
		const valA = (a as Record<string, unknown>)[key];
		const valB = (b as Record<string, unknown>)[key];

		if (valA === valB) continue;
		if (typeof valA === 'object' && typeof valB === 'object' && valA !== null && valB !== null) {
			const nested = deepDiff(valA, valB, path);
			if (nested.length > 0) {
				diffs.push(...nested);
			} else {
				diffs.push(path);
			}
		} else {
			diffs.push(path);
		}
	}

	return diffs;
}
