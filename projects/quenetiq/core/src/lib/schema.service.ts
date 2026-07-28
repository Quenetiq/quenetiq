import { Injectable, inject, type Provider, ENVIRONMENT_INITIALIZER, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

export interface SchemaServiceConfig {
	url?: string;
	headers?: Record<string, string>;
}

export const SCHEMA_SERVICE_CONFIG = new InjectionToken<SchemaServiceConfig>('SCHEMA_SERVICE_CONFIG');

let schemaDataCache: Record<string, unknown> | null = null;

@Injectable()
export class SchemaService {
	private readonly config: SchemaServiceConfig;
	private readonly http = inject(HttpClient, { optional: true });
	private schema$: Observable<Record<string, unknown> | null> | null = null;

	constructor() {
		this.config = inject(SCHEMA_SERVICE_CONFIG, { optional: true }) ?? {};
	}

	load(): Observable<Record<string, unknown> | null> {
		if (schemaDataCache) return of(schemaDataCache);

		if (!this.http || !this.config.url) {
			return of(null);
		}

		if (!this.schema$) {
			this.schema$ = this.http
				.post<{
					data: Record<string, unknown>;
				}>(this.config.url, { query: INTROSPECTION_QUERY }, { headers: this.config.headers ?? {} })
				.pipe(
					map((res) => {
						schemaDataCache = res.data;
						return res.data;
					}),
					catchError(() => of(null)),
					shareReplay(1),
				);
		}

		return this.schema$;
	}

	static setCache(data: Record<string, unknown> | null): void {
		schemaDataCache = data;
	}
}

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types { ...FullType }
      directives {
        name description locations args { ...InputValue }
      }
    }
  }
  fragment FullType on __Type {
    kind name description
    fields(includeDeprecated: true) {
      name description args { ...InputValue }
      type { ...TypeRef }
      isDeprecated deprecationReason
    }
    inputFields { ...InputValue }
    interfaces { ...TypeRef }
    enumValues(includeDeprecated: true) { name description isDeprecated deprecationReason }
    possibleTypes { ...TypeRef }
  }
  fragment InputValue on __InputValue {
    name description type { ...TypeRef } defaultValue
  }
  fragment TypeRef on __Type {
    kind name ofType { kind name ofType { kind name ofType { kind name } } }
  }
`;

export function provideSchemaFetch(config?: SchemaServiceConfig): Provider[] {
	return [
		...(config ? [{ provide: SCHEMA_SERVICE_CONFIG, useValue: config }] : []),
		SchemaService,
		{
			provide: ENVIRONMENT_INITIALIZER,
			multi: true,
			useValue: () => {
				const svc = inject(SchemaService);
				svc.load().subscribe();
			},
		},
	];
}
