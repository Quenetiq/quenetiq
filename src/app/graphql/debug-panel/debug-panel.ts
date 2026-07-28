import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { TuiButton, TuiExpand } from '@taiga-ui/core';
import { TuiTab, TuiTabs } from '@taiga-ui/kit';
import {
	GraphqlDebugService,
	parseFieldTree,
	buildMutationChart,
	normalizeData,
	groupEntities,
} from '@quenetiq/debugging';

@Component({
	selector: 'app-graphql-debug-panel',
	standalone: true,
	imports: [KeyValuePipe, TuiButton, TuiExpand, TuiTab, TuiTabs],
	templateUrl: './debug-panel.html',
	styleUrl: './debug-panel.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphqlDebugPanel {
	protected readonly service = inject(GraphqlDebugService);
	protected open = false;
	protected selectedIndex = 0;
	protected selectedEntryIndex: number | null = null;

	protected readonly tabs = ['List', 'Field Tree', 'Timing Chart', 'Entities'];

	protected get selectedEntry() {
		if (this.selectedEntryIndex === null) return null;
		return this.service.entries[this.selectedEntryIndex] ?? null;
	}

	protected toggle(): void {
		this.open = !this.open;
	}

	protected selectEntry(index: number): void {
		this.selectedEntryIndex = index;
		this.selectedIndex = 1;
	}

	protected fieldTree(query: string) {
		return parseFieldTree(query);
	}

	protected mutationChart() {
		return buildMutationChart(this.service.entries);
	}

	protected maxEnd(chart: ReturnType<typeof buildMutationChart>) {
		if (chart.length === 0) return 1;
		return chart.reduce((m: number, p) => Math.max(m, p.end), 0);
	}

	protected hasEntries(ents: Record<string, unknown[]>): boolean {
		return Object.keys(ents).length > 0;
	}

	protected entities(entryIndex: number) {
		const entry = this.service.entries[entryIndex];
		if (!entry || entry.result.status !== 'success') return {};
		return groupEntities(normalizeData((entry.result as { status: 'success'; data: unknown }).data));
	}
}
