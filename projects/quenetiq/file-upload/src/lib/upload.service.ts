import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { type Observable, catchError, of } from 'rxjs';
import { print, type DocumentNode, type QuenetiqConfig, QUENETIQ_CONFIG } from '@quenetiq/core';

export interface FileEntry {
	path: string;
	file: Blob;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
	private readonly http = inject(HttpClient);
	private readonly config: QuenetiqConfig =
		inject(QUENETIQ_CONFIG, { optional: true }) ?? { endpoint: '/graphql' };

	upload<T>(
		document: DocumentNode,
		variables: Record<string, unknown>,
	): Observable<{ data?: T; errors?: { message: string }[] }> {
		const query = print(document);
		const files: FileEntry[] = [];
		const cleanedVariables = replaceFiles(variables, files, []);

		const operations = JSON.stringify({ query, variables: cleanedVariables });
		const map_: Record<string, string[]> = {};
		for (const [index, entry] of files.entries()) {
			map_[String(index)] = [entry.path];
		}

		const formData = new FormData();
		formData.append('operations', operations);
		formData.append('map', JSON.stringify(map_));

		for (const [index, entry] of files.entries()) {
			formData.append(String(index), entry.file);
		}

		return this.http.post<{ data?: T; errors?: { message: string }[] }>(this.config.endpoint!, formData).pipe(
			catchError((error: unknown) => {
				if (error instanceof HttpErrorResponse) {
					return of({ errors: [{ message: error.message }] });
				}
				return of({ errors: [{ message: 'Upload failed' }] });
			}),
		);
	}
}

function replaceFiles(value: unknown, files: FileEntry[], segments: string[]): unknown {
	if (value instanceof File || value instanceof Blob) {
		files.push({ path: `variables.${segments.join('.')}`, file: value });
		return null;
	}

	if (Array.isArray(value)) {
		return value.map((item, index) => replaceFiles(item, files, [...segments, String(index)]));
	}

	if (value !== null && typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
			result[key] = replaceFiles(val, files, [...segments, key]);
		}
		return result;
	}

	return value;
}
