import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe, JsonPipe, DatePipe } from '@angular/common';
import { DevToolsService, type DevToolsTab } from './devtools.service';
import { type GraphqlDebugEntry } from '../graphql-debug.service';

@Component({
	selector: 'qtq-devtools-panel',
	standalone: true,
	imports: [AsyncPipe, JsonPipe, DatePipe],
	styleUrl: './devtools-panel.component.scss',
	templateUrl: './devtools-panel.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevToolsPanelComponent {
	private readonly devTools = inject(DevToolsService);

	readonly visible$ = this.devTools.visible$;
	readonly activeTab$ = this.devTools.activeTab$;
	readonly cacheSnapshot$ = this.devTools.cacheSnapshot$;
	readonly cacheMetrics$ = this.devTools.cacheMetrics$;

	get entries(): GraphqlDebugEntry[] {
		return this.devTools.entries.slice().reverse();
	}

	get errorEntries(): GraphqlDebugEntry[] {
		return this.devTools.entries
			.filter((e) => e.result.status === 'error')
			.slice()
			.reverse();
	}

	get queryCount(): number {
		return this.devTools.getQueryCount();
	}

	get errorCount(): number {
		return this.devTools.getErrorCount();
	}

	get cacheEntries(): number {
		return this.devTools.cacheSnapshotValue.length;
	}

	formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))  } ${  sizes[i]}`;
	}

	formatMs(ms: number): string {
		if (ms < 1) return '<1ms';
		if (ms < 1000) return `${ms.toFixed(1)}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}

	setTab(tab: DevToolsTab): void {
		this.devTools.setTab(tab);
	}

	close(): void {
		this.devTools.close();
	}
}
