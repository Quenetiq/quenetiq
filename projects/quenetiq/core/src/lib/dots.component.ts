import { Component, input, ChangeDetectionStrategy } from '@angular/core';

export type DotsSize = 'sm' | 'md' | 'lg';
export type DotsColor = 'primary' | 'accent' | 'warn' | 'inherit';

@Component({
	selector: 'qtq-dots',
	standalone: true,
	templateUrl: './dots.component.html',
	styleUrl: './dots.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuenetiqDotsComponent {
	readonly size = input<DotsSize>('md');
	readonly color = input<DotsColor>('primary');
	readonly showLabel = input(false);
	readonly label = input('Loading');
	readonly ariaLabel = input('Loading');
}
