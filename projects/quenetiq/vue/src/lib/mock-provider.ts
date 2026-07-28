import { defineComponent, type PropType, provide, type SlotsType } from 'vue';
import { QUENETIQ_CLIENT_KEY } from './plugin';
import { createCache, type CacheStore } from '@quenetiq/cache';
import {
	QuenetiqClient,
	createSchemaMock,
	print,
	type DocumentNode,
	type TypedDocumentNode,
	type GraphQLResult,
	type GraphqlRequestContext,
	type GraphqlMiddleware,
	type SchemaMockResult,
} from '@quenetiq/client';

function defaultPrint(query: string | DocumentNode | TypedDocumentNode): string {
	if (typeof query === 'string') return query;
	return print(query);
}

export interface MockRequest<TData = Record<string, unknown>, TVariables = Record<string, unknown>> {
	document: DocumentNode | TypedDocumentNode | string;
	variables?: TVariables;
	result: GraphQLResult<TData> | (() => Promise<GraphQLResult<TData>>);
	delay?: number;
}

function addTypenameDeep(value: unknown, path?: string): unknown {
	if (Array.isArray(value)) {
		return value.map((item, i) => addTypenameDeep(item, path ? `${path}.${i}` : `${i}`));
	}
	if (value !== null && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		if (obj.__typename === undefined && obj.id !== undefined) {
			const typename = path?.split('.')[0] ?? 'Unknown';
			obj.__typename = typename;
		}
		for (const key of Object.keys(obj)) {
			obj[key] = addTypenameDeep(obj[key], path ? `${path}.${key}` : key);
		}
	}
	return value;
}

function findMock(mocks: MockRequest[], queryStr: string, variables: Record<string, unknown>): MockRequest | undefined {
	return mocks.find((m) => {
		const mq = defaultPrint(m.document);
		if (mq !== queryStr) return false;
		if (m.variables !== undefined) {
			const mv = JSON.stringify(m.variables);
			const qv = JSON.stringify(variables);
			if (mv !== qv) return false;
		}
		return true;
	});
}

function buildMockClient(
	mocks: MockRequest[] | undefined,
	schemaMock: SchemaMockResult | null,
	addTypename: boolean,
	strict: boolean,
	cacheStore?: CacheStore,
): QuenetiqClient {
	const mockMiddleware: GraphqlMiddleware = async (request: GraphqlRequestContext) => {
		if (mocks) {
			const match = findMock(mocks, request.query, request.variables);
			if (match) {
				const raw = typeof match.result === 'function' ? await match.result() : match.result;
				if (match.delay) {
					await new Promise((r) => setTimeout(r, match.delay));
				}
				if (addTypename && raw.status === 'success') {
					return { ...raw, data: addTypenameDeep(raw.data) as typeof raw.data };
				}
				return raw;
			}
		}

		if (schemaMock) {
			const data = schemaMock.mockQuery(request.query);
			const added = addTypename ? addTypenameDeep(data) : data;
			return { status: 'success' as const, data: added as Record<string, unknown> };
		}

		if (strict) {
			throw new Error(
				`[@quenetiq/vue] No mock found for ${request.type}: ${request.query.slice(0, 80)}` +
				`\nVariables: ${JSON.stringify(request.variables)}`,
			);
		}
		return { status: 'error', error: 'No mock defined for query' };
	};

	return new QuenetiqClient(
		{ middleware: [mockMiddleware], cache: { enabled: false } },
		cacheStore,
	);
}

export const MockedProvider = /*#__PURE__*/ defineComponent({
	name: 'QuenetiqMockedProvider',
	props: {
		mocks: {
			type: Array as PropType<MockRequest[]>,
			default: undefined,
		},
		schema: {
			type: String,
			default: undefined,
		},
		addTypename: {
			type: Boolean,
			default: false,
		},
		strict: {
			type: Boolean,
			default: false,
		},
		cache: {
			type: Object as PropType<CacheStore>,
			default: undefined,
		},
	},
	slots: {} as SlotsType<{ default: () => unknown }>,
	setup(props, { slots }) {
		const cache = props.cache ?? createCache();
		const schemaMock = props.schema ? createSchemaMock({ schema: props.schema }) : null;
		const client = buildMockClient(props.mocks, schemaMock, props.addTypename, props.strict, cache);

		provide(QUENETIQ_CLIENT_KEY, client);

		return () => slots.default?.();
	},
});
