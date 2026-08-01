import {
	Component,
	ElementRef,
	type AfterViewInit,
	type OnDestroy,
	input,
	signal,
	output,
	ChangeDetectionStrategy,
	NgZone,
	inject,
} from '@angular/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';

@Component({
	selector: 'app-docs-playground',
	standalone: true,
	imports: [TuiButton, TuiIcon, TuiBadge],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './playground.component.html',
	styleUrl: './playground.component.scss',
})
export class PlaygroundComponent implements AfterViewInit, OnDestroy {
	readonly code = input.required<string>();

	readonly outputContent = signal('');
	readonly errorContent = signal('');
	readonly running = signal(false);
	readonly runComplete = output<string>();

	private editorView: EditorView | null = null;
	private readonly editorHost = inject(ElementRef);
	private readonly ngZone = inject(NgZone);

	ngAfterViewInit(): void {
		this.ngZone.runOutsideAngular(() => {
			const state = EditorState.create({
				doc: this.code(),
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
					javascript(),
					oneDark,
					syntaxHighlighting(defaultHighlightStyle),
					keymap.of([
						...closeBracketsKeymap,
						...defaultKeymap,
						...searchKeymap,
						...historyKeymap,
						indentWithTab,
					]),
					EditorView.theme({
						'&': { maxHeight: '400px' },
						'.cm-scroller': { overflow: 'auto' },
					}),
				],
			});

			this.editorView = new EditorView({
				state,
				parent: this.editorHost.nativeElement,
			});
		});
	}

	private runTimer: ReturnType<typeof setTimeout> | null = null;

	ngOnDestroy(): void {
		if (this.runTimer !== null) {
			clearTimeout(this.runTimer);
		}
		this.editorView?.destroy();
	}

	runCode(): void {
		if (this.runTimer !== null) {
			clearTimeout(this.runTimer);
			this.runTimer = null;
		}

		const code = this.editorView?.state.doc.toString() ?? this.code();
		this.running.set(true);
		this.outputContent.set('');
		this.errorContent.set('');

		const logs: string[] = [];
		const proxyConsole = {
			log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
			warn: (...args: unknown[]) => logs.push(`[warn] ${  args.map(String).join(' ')}`),
			error: (...args: unknown[]) => logs.push(`[error] ${  args.map(String).join(' ')}`),
			info: (...args: unknown[]) => logs.push(`[info] ${  args.map(String).join(' ')}`),
		};

		try {
			const fn = new Function('console', `"use strict";\n${  code}`);
			const result = fn(proxyConsole);
			const allOutput = [...logs, result !== undefined ? String(result) : ''].filter(Boolean).join('\n');
			this.outputContent.set(allOutput);
			this.runComplete.emit(allOutput);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			const allOutput = [...logs, `[error] ${  msg}`].join('\n');
			this.errorContent.set(allOutput);
		} finally {
			this.running.set(false);
			this.runTimer = null;
		}
	}
}
