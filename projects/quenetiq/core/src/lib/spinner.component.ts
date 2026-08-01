import { Component, input, ChangeDetectionStrategy } from '@angular/core';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'primary' | 'accent' | 'warn' | 'inherit';

@Component({
	selector: 'qtq-spinner',
	standalone: true,
	templateUrl: './spinner.component.html',
	styleUrl: './spinner.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuenetiqSpinnerComponent {
	readonly size = input<SpinnerSize>('md');
	readonly color = input<SpinnerColor>('primary');
	readonly showLabel = input(false);
	readonly label = input('Loading...');
	readonly ariaLabel = input('Loading');
}
