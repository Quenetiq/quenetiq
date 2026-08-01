import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';

@Component({
	selector: 'app-docs-stackblitz-starter',
	standalone: true,
	imports: [TuiButton],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './docs-stackblitz-starter.component.html',
	styleUrl: './docs-stackblitz-starter.component.scss',
})
export class StackblitzStarterComponent {
	readonly starter = input.required<string>();

	openStackblitz(): void {
		const starter = this.starter();
		const project = `quenetiq/starter-${starter}`;
		const url = `https://stackblitz.com/github/${project}`;
		window.open(url, '_blank', 'noopener');
	}
}
