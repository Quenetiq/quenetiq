import type { GraphqlDebugEntry } from './graphql-debug.service';

export interface InspectedField {
	name: string;
	depth: number;
	children?: InspectedField[];
}

export interface MutationChartPoint {
	label: string;
	start: number;
	end: number;
	duration: number;
	ok: boolean;
}

export interface NormalizedEntity {
	type: string;
	id: string;
	path: string;
}

export function parseFieldTree(query: string): InspectedField[] {
	const tree: InspectedField[] = [];
	const stack: InspectedField[] = [];
	let buf = '';
	let inString = false;
	let depth = 0;

	for (let i = 0; i < query.length; i++) {
		const c = query[i];
		if (inString) {
			buf += c;
			if (c === '"' && query[i - 1] !== '\\') inString = false;
			continue;
		}
		if (c === '"') {
			inString = true;
			buf += c;
			continue;
		}
		if (c === '#' && !inString) {
			while (i < query.length && query[i] !== '\n') i++;
			continue;
		}
		if (c === '{') {
			const name = buf.trim();
			buf = '';
			if (name && !['query', 'mutation', 'fragment', 'on'].includes(name)) {
				const node: InspectedField = { name, depth, children: [] };
				if (stack.length > 0) {
					const parent = stack[stack.length - 1];
					parent.children = parent.children ?? [];
					parent.children.push(node);
				} else {
					tree.push(node);
				}
				stack.push(node);
			}
			depth++;
			continue;
		}
		if (c === '}') {
			if (buf.trim()) {
				const name = buf.trim();
				if (name && !['query', 'mutation', 'fragment', 'on'].includes(name)) {
					const node: InspectedField = { name, depth };
					if (stack.length > 0) {
						const parent = stack[stack.length - 1];
						parent.children = parent.children ?? [];
						parent.children.push(node);
					} else {
						tree.push(node);
					}
				}
				buf = '';
			}
			if (stack.length > 0 && depth > 0) stack.pop();
			depth = Math.max(0, depth - 1);
			continue;
		}
		if (c === '(' || c === ')' || c === ':' || c === '!' || c === '$' || c === '@') {
			if (buf.trim()) {
				const name = buf.trim();
				buf = '';
				if (name && !['query', 'mutation', 'fragment', 'on'].includes(name) && !name.startsWith('$')) {
					const node: InspectedField = { name, depth };
					if (stack.length > 0) {
						const parent = stack[stack.length - 1];
						parent.children = parent.children ?? [];
						parent.children.push(node);
					} else {
						tree.push(node);
					}
				}
			}
			continue;
		}
		if (c === '\n' || c === '\r') {
			if (buf.trim()) {
				const name = buf.trim();
				buf = '';
				if (name && !['query', 'mutation', 'fragment', 'on'].includes(name) && !name.startsWith('$')) {
					const node: InspectedField = { name, depth };
					if (stack.length > 0) {
						const parent = stack[stack.length - 1];
						parent.children = parent.children ?? [];
						parent.children.push(node);
					} else {
						tree.push(node);
					}
				}
			}
			continue;
		}
		buf += c;
	}

	return tree;
}

export function buildMutationChart(entries: GraphqlDebugEntry[]): MutationChartPoint[] {
	if (entries.length === 0) return [];

	const minTime = Math.min(...entries.map((e) => e.timestamp));
	return entries.map((e) => ({
		label: e.operationName ?? '(anonymous)',
		start: e.timestamp - minTime,
		end: e.timestamp + e.duration - minTime,
		duration: e.duration,
		ok: e.result.status === 'success',
	}));
}

export function normalizeData(data: unknown, parentPath?: string): NormalizedEntity[] {
	if (!data || typeof data !== 'object') return [];

	const entries: NormalizedEntity[] = [];
	const datum = data as Record<string, unknown>;
	const typename = datum['__typename'] as string | undefined;
	const id = (datum['id'] ?? datum['_id']) as string | undefined;

	if (typename && id !== undefined && id !== null) {
		entries.push({ type: typename, id: String(id), path: parentPath ?? '.' });
	}

	for (const [k, v] of Object.entries(datum)) {
		if (k === '__typename') continue;
		if (Array.isArray(v)) {
			v.forEach((item, i) =>
				entries.push(...normalizeData(item, parentPath ? `${parentPath}.${k}[${i}]` : `${k}[${i}]`)),
			);
		} else if (v && typeof v === 'object') {
			entries.push(...normalizeData(v, parentPath ? `${parentPath}.${k}` : k));
		}
	}

	return entries;
}

export function groupEntities(entries: NormalizedEntity[]): Record<string, NormalizedEntity[]> {
	const groups: Record<string, NormalizedEntity[]> = {};
	for (const e of entries) {
		(groups[e.type] ??= []).push(e);
	}
	return groups;
}
