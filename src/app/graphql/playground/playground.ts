import {
	Component,
	type AfterViewInit,
	type OnDestroy,
	inject,
	signal,
	ChangeDetectionStrategy,
	NgZone,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiTab, TuiTabs, TuiBadge } from '@taiga-ui/kit';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import {
	bracketMatching,
	foldGutter,
	indentOnInput,
	syntaxHighlighting,
	defaultHighlightStyle,
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { json } from '@codemirror/lang-json';
import {
	parse,
	type DocumentNode,
	type GraphQLSchema,
	type GraphQLArgument,
	buildClientSchema,
	isInputObjectType,
	print,
	type IntrospectionQuery,
} from 'graphql';
import { GraphqlService, type GraphQLResult } from '@quenetiq/core';
import { graphqlLanguage } from './graphql-language';
import {
	graphqlCompletionSource,
	autocompletion as schemaAutocompletion,
} from './graphql-completion';
import { parseFilesAsync, type FileParseResult, type ParsedGraphQLFile } from './file-drop';

const SCHEMA_STORAGE_KEY = 'pg_introspection_result';

interface HistoryEntry {
	query: string;
	variables: string;
	result: GraphQLResult<unknown> | null;
	timestamp: number;
	durationMs: number;
}

@Component({
	selector: 'app-graphql-playground',
	standalone: true,
	imports: [FormsModule, TuiButton, TuiIcon, TuiTab, TuiTabs, TuiBadge],
	templateUrl: './playground.html',
	styleUrl: './playground.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphqlPlayground implements AfterViewInit, OnDestroy {
	private readonly graphql = inject(GraphqlService);
	private readonly ngZone = inject(NgZone);

	protected readonly query = signal('query {\n  __typename\n}');

	protected readonly variables = signal('');
	protected readonly result = signal<GraphQLResult<unknown> | null>(null);
	protected readonly loading = signal(false);
	protected readonly error = signal('');
	protected readonly history = signal<HistoryEntry[]>([]);
	protected readonly activeTab = signal(0);
	protected readonly historyOpen = signal(true);
	protected readonly elapsedTime = signal(0);
	protected readonly schema = signal<GraphQLSchema | null>(null);
	protected readonly schemaLoading = signal(false);
	protected readonly schemaError = signal('');
	protected readonly selectedSchemaType = signal<string | null>(null);
	protected readonly fileDropActive = signal(false);
	protected readonly parsedFiles = signal<FileParseResult | null>(null);
	protected readonly fileDropdownOpen = signal(false);

	private queryEditor: EditorView | null = null;
	private variablesEditor: EditorView | null = null;
	private timerInterval: ReturnType<typeof setInterval> | null = null;

	ngAfterViewInit(): void {
		this.ngZone.runOutsideAngular(() => {
			this.initQueryEditor();
			this.initVariablesEditor();
			this.initDragDrop();
			this.loadSchema();
		});
	}

	ngOnDestroy(): void {
		this.queryEditor?.destroy();
		this.variablesEditor?.destroy();
		this.clearTimer();
	}

	protected execute(): void {
		const queryStr = this.queryEditor?.state.doc.toString() ?? this.query();
		const variablesStr = this.variablesEditor?.state.doc.toString() ?? this.variables();
		if (!queryStr.trim()) {
			this.error.set('Query is empty');
			return;
		}

		let vars: Record<string, unknown> = {};
		try {
			const v = variablesStr.trim();
			if (v) vars = JSON.parse(v);
		} catch {
			this.error.set('Invalid JSON in Variables');
			return;
		}

		this.loading.set(true);
		this.error.set('');
		this.result.set(null);
		this.elapsedTime.set(0);
		this.startTimer();

		let doc: DocumentNode;
		try {
			doc = parse(queryStr);
		} catch (err) {
			this.error.set(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
			this.loading.set(false);
			this.clearTimer();
			return;
		}

		this.graphql.query(doc, vars).subscribe({
			next: (res) => {
				this.result.set(res);
				this.history.update((h) => [
					{
						query: queryStr,
						variables: variablesStr,
						result: res,
						timestamp: Date.now(),
						durationMs: this.elapsedTime(),
					},
					...h,
				]);
				this.loading.set(false);
				this.clearTimer();
			},
			error: (err: unknown) => {
				this.error.set(String(err));
				this.loading.set(false);
				this.clearTimer();
			},
		});
	}

	protected restore(entry: HistoryEntry): void {
		this.updateQueryEditor(entry.query);
		this.updateVariablesEditor(entry.variables);
		this.result.set(entry.result);
	}

	protected clearHistory(): void {
		this.history.set([]);
	}

	protected get schemaTypeNames(): string[] {
		const s = this.schema();
		if (!s) return [];
		return Object.keys(s.getTypeMap())
			.filter((name) => !name.startsWith('__'))
			.sort();
	}

	protected selectSchemaType(name: string): void {
		this.selectedSchemaType.set(name);
	}

	protected getSchemaType(typeName: string): {
		kind: string;
		name: string;
		description?: string;
		fields?: { name: string; typeStr: string; description?: string; args?: { name: string; typeStr: string }[] }[];
		enumValues?: { name: string }[];
		inputFields?: { name: string; typeStr: string }[];
		possibleTypes?: { name: string }[];
		directives?: { name: string; locations: readonly string[] }[];
	} | null {
		const s = this.schema();
		if (!s) return null;

		const type = s.getType(typeName);
		if (!type) return null;

		const result: ReturnType<typeof this.getSchemaType> = {
			kind: type.constructor.name.replace('GraphQL', ''),
			name: type.name,
			description: type.description ?? undefined,
		};

		const isInput = isInputObjectType(type);

		if ('getFields' in type && typeof type.getFields === 'function' && !isInput) {
			const fields = type.getFields();
			result.fields = Object.values(fields).map((f) => ({
				name: f.name,
				typeStr: f.type.toString(),
				description: f.description ?? undefined,
				args: f.args?.map((a: GraphQLArgument) => ({ name: a.name, typeStr: a.type.toString() })),
			}));
		}

		if ('getValues' in type && typeof type.getValues === 'function') {
			result.enumValues = type.getValues().map((v) => ({ name: v.name }));
		}

		if (isInput) {
			result.inputFields = Object.values(type.getFields()).map((f) => ({
				name: f.name,
				typeStr: f.type.toString(),
			}));
		}

		if ('getTypes' in type && typeof type.getTypes === 'function') {
			const unionType = type as { getTypes(): readonly { name: string }[] };
			result.possibleTypes = unionType.getTypes().map((t) => ({ name: t.name }));
		}

		if ('getDirectives' in s && typeof s.getDirectives === 'function') {
			result.directives = s.getDirectives().map((d) => ({
				name: d.name,
				locations: d.locations ?? [],
			}));
		}

		return result;
	}

	protected toggleHistory(): void {
		this.historyOpen.update((v) => !v);
	}

	protected formatJson(obj: unknown): string {
		try {
			return JSON.stringify(obj, null, 2);
		} catch {
			return String(obj);
		}
	}

	protected formatDuration(ms: number): string {
		if (ms < 1) return '<1ms';
		if (ms < 1000) return `${Math.round(ms)}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}

	protected formatTime(ts: number): string {
		return new Date(ts).toLocaleTimeString();
	}

	protected prettifyQuery(): void {
		const code = this.queryEditor?.state.doc.toString() ?? '';
		if (!code.trim()) return;
		try {
			const doc = parse(code);
			const printed = print(doc);
			this.updateQueryEditor(printed);
		} catch {
			// ignore parse errors in prettify
		}
	}

	protected prettifyVariables(): void {
		const code = this.variablesEditor?.state.doc.toString() ?? '';
		if (!code.trim()) return;
		try {
			const parsed = JSON.parse(code);
			this.updateVariablesEditor(JSON.stringify(parsed, null, 2));
		} catch {
			// ignore parse errors
		}
	}

	protected clearQuery(): void {
		this.updateQueryEditor('');
	}

	protected clearVariables(): void {
		this.updateVariablesEditor('');
	}

	protected onQueryKeydown(e: KeyboardEvent): void {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			this.execute();
		}
	}

	protected fetchSchema(): void {
		this.schemaLoading.set(true);
		this.schemaError.set('');

		const INTROSPECT = parse(INTROSPECTION_QUERY);
		this.graphql.query<IntrospectionQuery>(INTROSPECT).subscribe({
			next: (res) => {
				if (res.status === 'success' && res.data) {
					try {
						const schema = buildClientSchema(res.data);
						this.schema.set(schema);
						this.schemaLoading.set(false);
						try {
							localStorage.setItem(
								SCHEMA_STORAGE_KEY,
								JSON.stringify(res.data),
							);
						} catch {
							// storage full
						}
					} catch (err) {
						this.schemaError.set(
							`Failed to build schema: ${err instanceof Error ? err.message : String(err)}`,
						);
						this.schemaLoading.set(false);
					}
				} else {
					const msg =
						res.status === 'error' ? res.error : 'No data returned';
					this.schemaError.set(`Introspection failed: ${msg}`);
					this.schemaLoading.set(false);
				}
			},
			error: (err: unknown) => {
				this.schemaError.set(
					`Introspection error: ${err instanceof Error ? err.message : String(err)}`,
				);
				this.schemaLoading.set(false);
			},
		});
	}

	protected clearSchema(): void {
		this.schema.set(null);
		this.selectedSchemaType.set(null);
		try {
			localStorage.removeItem(SCHEMA_STORAGE_KEY);
		} catch {
			// ignore
		}
	}

	private async loadSchema(): Promise<void> {
		// 1. Try localStorage (set by previous Fetch Schema)
		try {
			const raw = localStorage.getItem(SCHEMA_STORAGE_KEY);
			if (raw) {
				const data = JSON.parse(raw) as IntrospectionQuery;
				this.schema.set(buildClientSchema(data));
				return;
			}
		} catch {
			// corrupt
		}

		// 2. Try static file (from `npm run schema:download`)
		try {
			const resp = await fetch('/schema/schema.json');
			if (resp.ok) {
				const data = (await resp.json()) as IntrospectionQuery;
				this.schema.set(buildClientSchema(data));
				return;
			}
		} catch {
			// file not found or network error
		}

		// 3. No schema available — user must click Fetch Schema
	}

	protected onFileDrop(event: DragEvent): void {
		event.preventDefault();
		event.stopPropagation();
		this.fileDropActive.set(false);

		const files = event.dataTransfer?.files;
		if (!files || files.length === 0) return;

		this.processFiles(files);
	}

	protected onFileDragOver(event: DragEvent): void {
		event.preventDefault();
		event.stopPropagation();
		this.fileDropActive.set(true);
	}

	protected onFileDragLeave(event: DragEvent): void {
		event.preventDefault();
		event.stopPropagation();
		this.fileDropActive.set(false);
	}

	protected onFileInputChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			this.processFiles(input.files);
			input.value = '';
		}
	}

	protected selectParsedFile(file: ParsedGraphQLFile): void {
		if (file.operations.length > 0) {
			const first = file.operations[0];
			const doc: DocumentNode = {
				kind: 'Document',
				definitions: file.fragments.length > 0 ? [first, ...file.fragments] : [first],
			};
			this.updateQueryEditor(print(doc));
		}
		this.fileDropdownOpen.set(false);
	}

	protected toggleFileDropdown(): void {
		this.fileDropdownOpen.update((v) => !v);
	}

	private async processFiles(files: FileList | File[]): Promise<void> {
		const result = await parseFilesAsync(files);
		this.parsedFiles.set(result);

		if (result.files.length > 0) {
			// Auto-load the first file's first operation
			const firstFile = result.files[0];
			if (firstFile.operations.length > 0) {
				const first = firstFile.operations[0];
				const doc: DocumentNode = {
					kind: 'Document',
					definitions: firstFile.fragments.length > 0 ? [first, ...firstFile.fragments] : [first],
				};
				this.updateQueryEditor(print(doc));
			} else if (firstFile.fragments.length > 0) {
				const doc: DocumentNode = {
					kind: 'Document',
					definitions: [firstFile.fragments[0]],
				};
				this.updateQueryEditor(print(doc));
			}
			this.fileDropdownOpen.set(true);
		}

		if (result.errors.length > 0) {
			this.error.set(result.errors.join('\n'));
		}
	}

	private initDragDrop(): void {
		const el = document.querySelector('.pg__editor-pane');
		if (!el) return;

		el.addEventListener('dragover', (e) => {
			e.preventDefault();
			this.ngZone.run(() => this.fileDropActive.set(true));
		});

		el.addEventListener('dragleave', (e) => {
			e.preventDefault();
			this.ngZone.run(() => this.fileDropActive.set(false));
		});

		el.addEventListener('drop', (e) => {
			e.preventDefault();
			this.ngZone.run(() => {
				this.fileDropActive.set(false);
				const files = (e as DragEvent).dataTransfer?.files;
				if (files && files.length > 0) {
					this.processFiles(files);
				}
			});
		});
	}

	private initQueryEditor(): void {
		const host = document.querySelector('#query-editor-host');
		if (!host) return;

		const state = EditorState.create({
			doc: this.query(),
			extensions: [
				lineNumbers(),
				highlightActiveLine(),
				highlightActiveLineGutter(),
				history(),
				foldGutter(),
				indentOnInput(),
				bracketMatching(),
				closeBrackets(),
				highlightSelectionMatches(),
				schemaAutocompletion({
					override: [graphqlCompletionSource(() => this.schema())],
					activateOnTyping: true,
				}),
				graphqlLanguage,
				oneDark,
				syntaxHighlighting(defaultHighlightStyle),
				keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, indentWithTab]),
				EditorView.theme({
					'&': { height: '100%', maxHeight: '100%' },
					'.cm-scroller': {
						overflow: 'auto',
						fontFamily: '\'Fira Code\', \'Cascadia Code\', \'JetBrains Mono\', monospace',
					},
					'.cm-gutters': { borderRight: '1px solid rgba(255,255,255,0.08)' },
				}),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						this.query.set(update.state.doc.toString());
					}
				}),
			],
		});

		this.queryEditor = new EditorView({ state, parent: host });
	}

	private initVariablesEditor(): void {
		const host = document.querySelector('#variables-editor-host');
		if (!host) return;

		const state = EditorState.create({
			doc: this.variables(),
			extensions: [
				lineNumbers(),
				highlightActiveLine(),
				history(),
				foldGutter(),
				bracketMatching(),
				closeBrackets(),
				json(),
				oneDark,
				syntaxHighlighting(defaultHighlightStyle),
				keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
				EditorView.theme({
					'&': { height: '100%', maxHeight: '100%' },
					'.cm-scroller': {
						overflow: 'auto',
						fontFamily: '\'Fira Code\', \'Cascadia Code\', \'JetBrains Mono\', monospace',
					},
					'.cm-gutters': { borderRight: '1px solid rgba(255,255,255,0.08)' },
				}),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						this.variables.set(update.state.doc.toString());
					}
				}),
			],
		});

		this.variablesEditor = new EditorView({ state, parent: host });
	}

	private updateQueryEditor(value: string): void {
		if (this.queryEditor) {
			this.queryEditor.dispatch({
				changes: { from: 0, to: this.queryEditor.state.doc.length, insert: value },
			});
		}
		this.query.set(value);
	}

	private updateVariablesEditor(value: string): void {
		if (this.variablesEditor) {
			this.variablesEditor.dispatch({
				changes: { from: 0, to: this.variablesEditor.state.doc.length, insert: value },
			});
		}
		this.variables.set(value);
	}

	private startTimer(): void {
		this.clearTimer();
		const start = performance.now();
		this.timerInterval = setInterval(() => {
			this.elapsedTime.set(performance.now() - start);
		}, 30);
	}

	private clearTimer(): void {
		if (this.timerInterval !== null) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
	}
}

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name kind }
      mutationType { name kind }
      subscriptionType { name kind }
      types {
        ...FullType
      }
      directives(includeDeprecated: false) {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: false) {
      name
      description
      args(includeDeprecated: false) {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields(includeDeprecated: false) {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: false) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type { ...TypeRef }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;
