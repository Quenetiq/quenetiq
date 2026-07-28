import { Injectable, inject, type Provider, ENVIRONMENT_INITIALIZER } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, from, of } from 'rxjs';
import { concatMap, map, catchError } from 'rxjs/operators';

export interface SchemaProgressEvent {
	loaded: number;
	total: number;
	typeName?: string;
	done: boolean;
}

export interface SchemaStreamConfig {
	url: string;
	headers?: Record<string, string>;
}

const NAMES_QUERY = `
  query SchemaNames {
    __schema {
      types { name kind }
    }
  }
`;

const TYPE_QUERY = `
  query TypeByName($name: String!) {
    __type(name: $name) {
      kind name description
      fields(includeDeprecated: true) {
        name description
        args { name description type { ...TypeRef } defaultValue }
        type { ...TypeRef }
        isDeprecated deprecationReason
      }
      inputFields {
        name description type { ...TypeRef } defaultValue
      }
      interfaces { ...TypeRef }
      enumValues(includeDeprecated: true) { name description isDeprecated deprecationReason }
      possibleTypes { ...TypeRef }
    }
  }
  fragment TypeRef on __Type {
    kind name ofType { kind name ofType { kind name ofType { kind name } } }
  }
`;

const SKIP_TYPES = new Set([
	'__Type',
	'__Field',
	'__InputValue',
	'__EnumValue',
	'__Directive',
	'__Schema',
	'__TypeKind',
	'__DirectiveLocation',
	'String',
	'Int',
	'Float',
	'Boolean',
	'ID',
]);

@Injectable()
export class SchemaStreamService {
	private readonly http = inject(HttpClient, { optional: true });

	streamIntrospection(config: SchemaStreamConfig): Observable<SchemaProgressEvent> {
		const events = new Subject<SchemaProgressEvent>();
		const http = this.http;

		if (!http) {
			setTimeout(() => events.error(new Error('HttpClient not provided')));
			return events;
		}

		const headers = config.headers ?? {};

		http
			.post<{ data: { __schema: { types: { name: string; kind: string }[] } } }>(
				config.url,
				{ query: NAMES_QUERY },
				{ headers },
			)
			.pipe(
				map((res) => {
					const allTypes = res?.data?.__schema?.types ?? [];
					return allTypes.filter((t) => !SKIP_TYPES.has(t.name));
				}),
				concatMap((types) => {
					const total = types.length;
					events.next({ loaded: 0, total, done: false });

					if (total === 0) {
						events.next({ loaded: 0, total: 0, done: true });
						events.complete();
						return of(null);
					}

					return from(types).pipe(
						concatMap((type) =>
							http
								.post<{
									data: { __type: Record<string, unknown> | null };
								}>(config.url, { query: TYPE_QUERY, variables: { name: type.name } }, { headers })
								.pipe(
									map(() => {
										const idx = types.indexOf(type);
										return {
											loaded: idx + 1,
											total,
											typeName: type.name,
											done: idx === types.length - 1,
										} as SchemaProgressEvent;
									}),
									catchError(() =>
										of({
											loaded: types.indexOf(type) + 1,
											total,
											typeName: type.name,
											done: types.indexOf(type) === types.length - 1,
										} as SchemaProgressEvent),
									),
								),
						),
					);
				}),
				catchError((err) => {
					events.error(err);
					return of(null);
				}),
			)
			.subscribe({
				next: (progress) => {
					if (progress) events.next(progress);
				},
				error: (err) => events.error(err),
				complete: () => events.complete(),
			});

		return events;
	}
}

export function provideSchemaStream(config?: { url?: string; batchSize?: number }): Provider[] {
	return [
		SchemaStreamService,
		...(config?.url
			? [
					{
						provide: ENVIRONMENT_INITIALIZER,
						multi: true,
						useFactory: () => {
							const svc = inject(SchemaStreamService);
							return () => {
								svc.streamIntrospection({ url: config.url! }).subscribe();
							};
						},
					} as Provider,
			]
			: []),
	];
}
