import { parse, type DocumentNode, type DefinitionNode, type OperationDefinitionNode, type FragmentDefinitionNode } from 'graphql';

export interface ParsedGraphQLFile {
	name: string;
	operations: OperationDefinitionNode[];
	fragments: FragmentDefinitionNode[];
	raw: string;
}

export interface FileParseResult {
	files: ParsedGraphQLFile[];
	errors: string[];
}

function isOperation(def: DefinitionNode): def is OperationDefinitionNode {
	return def.kind === 'OperationDefinition';
}

function isFragment(def: DefinitionNode): def is FragmentDefinitionNode {
	return def.kind === 'FragmentDefinition';
}

function operationLabel(op: OperationDefinitionNode): string {
	const name = op.name?.value ?? '(anonymous)';
	return `${op.operation} ${name}`;
}

export function parseGraphQLFile(content: string, fileName: string): ParsedGraphQLFile {
	const doc = parse(content, { noLocation: true });
	const operations = doc.definitions.filter(isOperation);
	const fragments = doc.definitions.filter(isFragment);
	return { name: fileName, operations, fragments, raw: content };
}

export async function parseFilesAsync(files: FileList | File[]): Promise<FileParseResult> {
	const result: FileParseResult = { files: [], errors: [] };

	for (const file of Array.from(files)) {
		const ext = file.name.split('.').pop()?.toLowerCase();
		if (ext !== 'graphql' && ext !== 'gql' && ext !== 'ts' && ext !== 'js') {
			result.errors.push(`${file.name}: unsupported file type (expected .graphql, .gql, .ts, .js)`);
			continue;
		}

		try {
			const content = await file.text();

			if (ext === 'ts' || ext === 'js') {
				const extracted = extractGqlFromSource(file.name, content);
				if (extracted) {
					result.files.push(extracted);
				} else {
					result.errors.push(`${file.name}: no gql template found`);
				}
			} else {
				const parsed = parseGraphQLFile(content, file.name);
				result.files.push(parsed);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			result.errors.push(`${file.name}: ${msg}`);
		}
	}

	return result;
}

function extractGqlFromSource(fileName: string, content: string): ParsedGraphQLFile | null {
	const gqlRegex = /(?:gql|graphql|rawQuery)`([\s\S]*?)`/g;
	const operations: OperationDefinitionNode[] = [];
	const fragments: FragmentDefinitionNode[] = [];
	let raw = '';
	let match: RegExpExecArray | null;

	while ((match = gqlRegex.exec(content)) !== null) {
		const templateContent = match[1];
		if (!templateContent.trim()) continue;
		raw += `${templateContent  }\n`;

		try {
			const doc = parse(templateContent, { noLocation: true });
			operations.push(...doc.definitions.filter(isOperation));
			fragments.push(...doc.definitions.filter(isFragment));
		} catch {
			// Skip unparseable segments
		}
	}

	const strRegex = /['"`](query\s|mutation\s|subscription\s|fragment\s)[^'"`]*['"`]/g;
	while ((match = strRegex.exec(content)) !== null) {
		const str = match[0].slice(1, -1);
		try {
			const doc = parse(str, { noLocation: true });
			operations.push(...doc.definitions.filter(isOperation));
			fragments.push(...doc.definitions.filter(isFragment));
			raw += `${str  }\n`;
		} catch {
			// Skip
		}
	}

	if (operations.length === 0 && fragments.length === 0) return null;

	return { name: fileName, operations, fragments, raw: raw.trim() };
}

export function formatFileSummary(result: FileParseResult): string {
	const lines: string[] = [];
	for (const file of result.files) {
		const ops = file.operations.map((op) => operationLabel(op));
		const frags = file.fragments.map((f) => `fragment ${f.name.value}`);
		lines.push(`📄 ${file.name}`);
		for (const op of ops) lines.push(`   └─ ${op}`);
		for (const fr of frags) lines.push(`   └─ ${fr}`);
	}
	for (const err of result.errors) {
		lines.push(`❌ ${err}`);
	}
	return lines.join('\n');
}

export function buildOperationsIndex(result: FileParseResult): { label: string; doc: DocumentNode }[] {
	const items: { label: string; doc: DocumentNode }[] = [];
	for (const file of result.files) {
		for (const op of file.operations) {
			const name = op.name?.value ?? '(anonymous)';
			const doc: DocumentNode = {
				kind: 'Document',
				definitions: file.fragments.length > 0 ? [op, ...file.fragments] : [op],
			};
			items.push({ label: `[${file.name}] ${op.operation} ${name}`, doc });
		}
		for (const frag of file.fragments) {
			const doc: DocumentNode = {
				kind: 'Document',
				definitions: [frag],
			};
			items.push({ label: `[${file.name}] fragment ${frag.name.value}`, doc });
		}
	}
	return items;
}
