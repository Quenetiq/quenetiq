import { parse, type DocumentNode } from 'graphql';

export interface FragmentDefinition<TData = unknown, TVars extends Record<string, unknown> = Record<string, unknown>> {
	document: DocumentNode;
	name: string;
	__data?: TData;
	__variables?: TVars;
}

export function fragment<TData, TVars extends Record<string, unknown> = Record<string, unknown>>(
	strings: TemplateStringsArray,
	...values: string[]
): FragmentDefinition<TData, TVars> {
	const source = String.raw(strings, ...values);
	const document = parse(source);
	const name = extractFragmentName(document);
	return { document, name };
}

export function getFragment<TData, TVars extends Record<string, unknown> = Record<string, unknown>>(
	def: FragmentDefinition<TData, TVars>,
): DocumentNode {
	return def.document;
}

export function spread<TData, TVars extends Record<string, unknown> = Record<string, unknown>>(
	def: FragmentDefinition<TData, TVars>,
): string {
	return `...${def.name}`;
}

export function compose(...defs: FragmentDefinition[]): DocumentNode {
	const docs = defs.map((d) => d.document);
	return {
		kind: 'Document',
		definitions: docs.reduce<DocumentNode['definitions']>((acc, d) => acc.concat(d.definitions), []),
	} as unknown as DocumentNode;
}

type FragmentKey<TData> = Readonly<Record<` ${string}`, TData>>;

/** Inline typed fragment with optional phantom type params */
interface TypedDoc {
	__resultType?: unknown;
	__variablesType?: Record<string, unknown>;
}

export function useFragment<TData>(
	_fragment: FragmentDefinition<TData> | TypedDoc,
	data: TData | null | undefined,
): TData | null;
export function useFragment<TData>(
	_fragment: FragmentDefinition<TData> | TypedDoc,
	data: FragmentKey<TData> | null | undefined,
): TData | null;
export function useFragment<TData>(
	_fragment: FragmentDefinition<TData> | TypedDoc,
	data: TData | FragmentKey<TData> | null | undefined,
): TData | null {
	if (data == null) return null;
	if (typeof data === 'object' && data !== null) {
		for (const key of Object.keys(data)) {
			if (key.startsWith(' ')) return (data as Record<string, unknown>)[key] as TData;
		}
	}
	return data as TData;
}

function extractFragmentName(doc: DocumentNode): string {
	for (const def of doc.definitions) {
		if (def.kind === 'FragmentDefinition' && def.name?.kind === 'Name') {
			return def.name.value;
		}
	}
	throw new Error('No fragment definition found');
}
