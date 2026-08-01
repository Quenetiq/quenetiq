import { Component, ChangeDetectionStrategy, inject, type OnDestroy, signal } from '@angular/core';
import { type Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NullDetectionService } from './null-detection.service';

@Component({
	selector: 'qtq-null-overlay',
	standalone: true,
	templateUrl: './null-overlay.component.html',
	styleUrl: './null-overlay.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NullOverlay implements OnDestroy {
	private readonly detector = inject(NullDetectionService, { optional: true });
	private readonly sub: Subscription | null = null;
	private lastTimeout: ReturnType<typeof setTimeout> | null = null;

	protected readonly title = signal('');
	protected readonly message = signal('');
	protected readonly isNull = signal(false);
	protected readonly visible = signal(false);

	constructor() {
		if (!this.detector) return;

		this.sub = this.detector.onEvent.pipe(filter(() => !this.visible())).subscribe((event) => {
			if (this.lastTimeout) clearTimeout(this.lastTimeout);

			if (event.type === 'null-value') {
				this.title.set('NULL DETECTED');
				this.message.set(event.path ?? 'unknown');
				this.isNull.set(true);
			} else {
				this.title.set('У ВАС ОШИБКА В КВЕРИ');
				this.message.set(event.message);
				this.isNull.set(false);
			}
			this.visible.set(true);
			this.lastTimeout = setTimeout(() => this.visible.set(false), 3000);
		});
	}

	ngOnDestroy(): void {
		this.sub?.unsubscribe();
		if (this.lastTimeout) clearTimeout(this.lastTimeout);
	}
}
