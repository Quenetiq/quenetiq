import { Component, input, output, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { HeroParticles } from '../hero-particles/hero-particles';

@Component({
	selector: 'app-welcome-section',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink, TuiButton, HeroParticles],
	templateUrl: './welcome-section.html',
	styleUrl: './welcome-section.scss',
})
export class WelcomeSection {
	readonly title = input('Quenetiq');
	readonly subtitle = input('GraphQL for the rest of us');
	readonly description = input('A lightweight, modular GraphQL client built for Angular. Zero magic, full control.');
	readonly ctaText = input('Get Started');
	readonly ctaLink = input('/docs/getting-started');
	readonly secondaryText = input('View on GitHub');

	protected readonly ctaClick = output<void>();

	@HostListener('mousemove', ['$event'])
	protected onMouseMove(event: MouseEvent): void {
		const el = event.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		const cx = rect.width / 2;
		const cy = rect.height / 2;
		const mx = event.clientX - rect.left;
		const my = event.clientY - rect.top;

		const nx = (mx - cx) / cx;
		const ny = (my - cy) / cy;

		el.style.setProperty('--mx', String(nx * 0.5 + 0.5));
		el.style.setProperty('--my', String(ny * 0.5 + 0.5));
		el.style.setProperty('--px', String(event.clientX));
		el.style.setProperty('--py', String(event.clientY));
	}
}
