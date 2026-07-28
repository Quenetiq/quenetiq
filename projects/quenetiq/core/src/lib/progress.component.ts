import { Component, input, ChangeDetectionStrategy } from '@angular/core';

export type ProgressColor = 'primary' | 'accent' | 'warn' | 'success' | 'inherit';
export type ProgressSize = 'sm' | 'md' | 'lg';

@Component({
	selector: 'qtq-progress',
	standalone: true,
	templateUrl: './progress.component.html',
	styleUrl: './progress.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuenetiqProgressComponent {
	readonly value = input(0);
	readonly color = input<ProgressColor>('primary');
	readonly size = input<ProgressSize>('md');
	readonly width = input<string>();
	readonly showLabel = input(false);
	readonly indeterminate = input(false);
}
