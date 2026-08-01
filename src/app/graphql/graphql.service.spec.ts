import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GraphqlService, provideQuenetiq, gql, query, mutate } from '@quenetiq/core';
import type { DocumentNode, GraphQLResult } from '@quenetiq/core';
import { GET_CURRENT_USER, GET_NOTES } from './queries';

const TEST_QUERY: DocumentNode = gql`
	query Status {
		status
	}
`;

const TEST_MUTATION: DocumentNode = gql`
	mutation UploadFile($file: Upload!) {
		uploadFile(file: $file) {
			id
		}
	}
`;

interface GetCurrentUserResponse {
	getCurrentUser: {
		id: string;
		username: string;
		createdAt: string;
		updatedAt: string;
	};
}

describe('GraphqlService', () => {
	let service: GraphqlService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), provideQuenetiq({ endpoint: '/graphql' })],
		});

		service = TestBed.inject(GraphqlService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('sends query and returns data', () => {
		let result: unknown;

		service.query<{ status: string }>(TEST_QUERY).subscribe((r) => {
			result = r;
		});

		const req = httpMock.expectOne('/graphql');
		expect(req.request.method).toBe('POST');
		expect(req.request.body.query).toBe('{\n  status\n}');
		expect(req.request.headers.get('Content-Type')).toBe('application/json');

		req.flush({ data: { status: 'ok' } });

		expect(result).toEqual({ status: 'success', data: { status: 'ok' } });
	});

	it('handles graphql errors from backend', () => {
		let result: unknown;

		service.query<{ status: string }>(TEST_QUERY).subscribe((r) => {
			result = r;
		});

		const req = httpMock.expectOne('/graphql');
		req.flush({ errors: [{ message: 'Unauthorized' }] });

		expect(result).toEqual({ status: 'error', error: 'Unauthorized', errorCode: 'GRAPHQL_ERROR', graphQLErrors: [{ message: 'Unauthorized' }] });
	});

	it('handles empty data response', () => {
		let result: unknown;

		service.query<{ status: string }>(TEST_QUERY).subscribe((r) => {
			result = r;
		});

		const req = httpMock.expectOne('/graphql');
		req.flush({});

		expect(result).toEqual({ status: 'error', error: 'No data returned from server', errorCode: 'NO_DATA' });
	});

	it('handles http network error', () => {
		let result: unknown;

		service.query<{ status: string }>(TEST_QUERY).subscribe((r) => {
			result = r;
		});

		const req = httpMock.expectOne('/graphql');
		req.error(new ProgressEvent('offline'), { status: 0, statusText: 'Unknown Error' });

		expect(result).toEqual({
			status: 'error',
			error: 'Unknown Error',
			errorCode: 'NETWORK_ERROR',
			networkError: { message: 'Unknown Error', status: 0, statusText: 'Unknown Error' },
		});
	});

	it('handles http 500 error', () => {
		let result: unknown;

		service.query<{ status: string }>(TEST_QUERY).subscribe((r) => {
			result = r;
		});

		const req = httpMock.expectOne('/graphql');
		req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

		expect(result).toEqual({
			status: 'error',
			error: 'Internal Server Error',
			errorCode: 'NETWORK_ERROR',
			networkError: { message: 'Internal Server Error', status: 500, statusText: 'Internal Server Error' },
		});
	});

	it('sends mutation via JSON when no files present', () => {
		let result: unknown;

		service.mutate<{ uploadFile: { id: string } }>(TEST_MUTATION, { file: 'string-val' }).subscribe((r) => {
			result = r;
		});

		const req = httpMock.expectOne('/graphql');
		expect(req.request.method).toBe('POST');
		expect(req.request.body.query).toBe(
			'mutation UploadFile($file: Upload!) {\n  uploadFile(file: $file) {\n    id\n  }\n}',
		);
		expect(req.request.body.variables).toEqual({ file: 'string-val' });
		expect(req.request.headers.get('Content-Type')).toBe('application/json');

		req.flush({ data: { uploadFile: { id: '1' } } });
		expect(result).toEqual({ status: 'success', data: { uploadFile: { id: '1' } } });
	});

	it('sends mutation via multipart when variables contain File', () => {
		let result: unknown;
		const file = new File(['content'], 'test.txt', { type: 'text/plain' });

		service.mutate<{ uploadFile: { id: string } }>(TEST_MUTATION, { file }).subscribe((r) => {
			result = r;
		});

		const req = httpMock.expectOne('/graphql');
		expect(req.request.method).toBe('POST');

		const body = req.request.body as FormData;
		expect(body).toBeInstanceOf(FormData);

		const operations = JSON.parse(body.get('operations') as string);
		expect(operations.query).toBe('mutation UploadFile($file: Upload!) {\n  uploadFile(file: $file) {\n    id\n  }\n}');
		expect(operations.variables.file).toBeNull();

		const map = JSON.parse(body.get('map') as string);
		expect(map['0']).toEqual(['variables.file']);

		const uploadedFile = body.get('0') as File;
		expect(uploadedFile).toBeInstanceOf(File);
		expect(uploadedFile.name).toBe('test.txt');

		req.flush({ data: { uploadFile: { id: '1' } } });
		expect(result).toEqual({ status: 'success', data: { uploadFile: { id: '1' } } });
	});
});

describe('GraphqlService with custom endpoint', () => {
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), provideQuenetiq({ endpoint: '/api/graphql' })],
		});

		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('uses custom endpoint from provideQuenetiq', () => {
		const svc = TestBed.inject(GraphqlService);
		let result: unknown;

		svc.query<{ status: string }>(TEST_QUERY).subscribe((r) => {
			result = r;
		});

		const req = httpMock.expectOne('/api/graphql');
		expect(req.request.url).toBe('/api/graphql');

		req.flush({ data: { status: 'ok' } });
		expect(result).toEqual({ status: 'success', data: { status: 'ok' } });
	});
});

describe('GraphqlService with default config', () => {
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), provideQuenetiq({ endpoint: '/graphql' })],
		});

		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('uses configured /graphql endpoint', () => {
		const svc = TestBed.inject(GraphqlService);

		svc.query<{ status: string }>(TEST_QUERY).subscribe();

		const req = httpMock.expectOne('/graphql');
		expect(req.request.url).toBe('/graphql');

		req.flush({ data: { status: 'ok' } });
	});
});

describe('standalone query() function', () => {
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), provideQuenetiq({ endpoint: '/graphql' })],
		});

		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('sends a query via standalone function', async () => {
		let result: unknown;

		TestBed.runInInjectionContext(() => {
			query(TEST_QUERY).result$.subscribe((r: unknown) => {
				result = r;
			});
		});

		// toObservable uses effect() which fires asynchronously
		await new Promise((r) => setTimeout(r, 0));

		const req = httpMock.expectOne('/graphql');
		req.flush({ data: { status: 'ok' } });

		expect(result).toEqual({ status: 'success', data: { status: 'ok' } });
	});
});

describe('standalone mutate() function', () => {
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), provideQuenetiq({ endpoint: '/graphql' })],
		});

		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('sends a mutation via standalone function', () => {
		let result: unknown;

		TestBed.runInInjectionContext(() => {
			mutate(TEST_QUERY).subscribe((r) => {
				result = r;
			});
		});

		const req = httpMock.expectOne('/graphql');
		req.flush({ data: { status: 'ok' } });

		expect(result).toEqual({ status: 'success', data: { status: 'ok' } });
	});
});

describe('Typed queries from barrel', () => {
	let service: GraphqlService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), provideQuenetiq({ endpoint: '/graphql' })],
		});

		service = TestBed.inject(GraphqlService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('sends GetCurrentUser query', () => {
		let result: GraphQLResult<GetCurrentUserResponse> | undefined;

		service.query<GetCurrentUserResponse>(GET_CURRENT_USER).subscribe((r) => {
			result = r;
		});

		const req = httpMock.expectOne('/graphql');
		expect(req.request.body.query).toContain('getCurrentUser');
		expect(req.request.body.query).toContain('id');
		expect(req.request.body.query).toContain('username');
		expect(req.request.body.query).toContain('createdAt');

		req.flush({
			data: {
				getCurrentUser: {
					id: 'abc-123',
					username: 'testuser',
					createdAt: '2025-06-01T00:00:00Z',
					updatedAt: '2025-06-01T00:00:00Z',
				},
			},
		});

		expect(result).toEqual({
			status: 'success',
			data: {
				getCurrentUser: {
					id: 'abc-123',
					username: 'testuser',
					createdAt: '2025-06-01T00:00:00Z',
					updatedAt: '2025-06-01T00:00:00Z',
				},
			},
		});
	});

	it('sends GetNotes query with filter variable', () => {
		let result: GraphQLResult<{ getNotes: unknown[] }> | undefined;

		service
			.query<{ getNotes: unknown[] }, { filter?: string | null }>(GET_NOTES, { filter: 'PASSWORD' })
			.subscribe((r) => {
				result = r;
			});

		const req = httpMock.expectOne('/graphql');
		expect(req.request.body.query).toContain('getNotes');
		expect(req.request.body.variables).toEqual({ filter: 'PASSWORD' });

		req.flush({
			data: {
				getNotes: [
					{
						id: '1',
						title: 'My Password',
						content: 'secret',
						description: null,
						iconUrl: null,
						noteType: 'PASSWORD',
						createdAt: '2025-06-01T00:00:00Z',
						updatedAt: null,
					},
				],
			},
		});

		expect(result).toEqual({
			status: 'success',
			data: {
				getNotes: [
					{
						id: '1',
						title: 'My Password',
						content: 'secret',
						description: null,
						iconUrl: null,
						noteType: 'PASSWORD',
						createdAt: '2025-06-01T00:00:00Z',
						updatedAt: null,
					},
				],
			},
		});
	});

	it('refetches GetCurrentUser and creates a new network request', () => {
		let firstResult: GraphQLResult<GetCurrentUserResponse> | undefined;

		service.refetch<GetCurrentUserResponse>(GET_CURRENT_USER).subscribe((r) => {
			firstResult = r;
		});

		const req = httpMock.expectOne('/graphql');
		expect(req.request.body.query).toContain('getCurrentUser');
		req.flush({
			data: {
				getCurrentUser: {
					id: '1',
					username: 'alice',
					createdAt: '',
					updatedAt: '',
				},
			},
		});

		expect(firstResult).toEqual({
			status: 'success',
			data: { getCurrentUser: { id: '1', username: 'alice', createdAt: '', updatedAt: '' } },
		});
	});
});

describe('Plugins system', () => {
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.resetTestingModule();
	});

	afterEach(() => {
		if (httpMock) {
			httpMock.verify();
		}
	});

	it('invokes onInit and registers getMiddleware from plugins', () => {
		let initialized = false;
		let middlewareCalled = false;

		const testPlugin = {
			name: 'TestPlugin',
			onInit() {
				initialized = true;
			},
			getMiddleware() {
				return (request: unknown, next: (req: unknown) => unknown) => {
					middlewareCalled = true;
					return next(request);
				};
			},
		};

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideQuenetiq({
					endpoint: '/graphql',
					plugins: [testPlugin],
				}),
			],
		});

		const svc = TestBed.inject(GraphqlService);
		httpMock = TestBed.inject(HttpTestingController);

		svc.query(TEST_QUERY).subscribe();

		const req = httpMock.expectOne('/graphql');
		req.flush({ data: { status: 'ok' } });

		expect(initialized).toBe(true);
		expect(middlewareCalled).toBe(true);
	});
});
