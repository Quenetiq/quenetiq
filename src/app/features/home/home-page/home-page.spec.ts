import { describe, it, expect, beforeAll } from 'vitest';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTaiga } from '@taiga-ui/core';
import { HomePage } from './home-page';

beforeAll(() => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => undefined,
			removeListener: () => undefined,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			dispatchEvent: () => false,
		}),
	});
});

describe('HomePage', () => {
	let fixture: ComponentFixture<HomePage>;

	beforeEach(async () => {
		await TestBed.resetTestingModule()
			.configureTestingModule({
				imports: [HomePage],
				providers: [provideHttpClient(), provideRouter([]), provideTaiga()],
			})
			.compileComponents();

		fixture = TestBed.createComponent(HomePage);
		fixture.detectChanges();
	});

	it('creates the component', () => {
		expect(fixture.componentInstance).toBeTruthy();
	});

	it('renders start button in CTA', () => {
		const compiled = fixture.nativeElement as HTMLElement;
		const buttons = compiled.querySelectorAll('[tuiButton]');
		expect(buttons.length).toBeGreaterThanOrEqual(2);
	});

	it('shows the CTA section heading', () => {
		const compiled = fixture.nativeElement as HTMLElement;
		expect(compiled.textContent).toContain('Ready to simplify your GraphQL?');
	});
});
