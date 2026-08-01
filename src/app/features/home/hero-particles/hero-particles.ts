import {
	Component,
	viewChild,
	type ElementRef,
	afterNextRender,
	DestroyRef,
	inject,
	ChangeDetectionStrategy,
} from '@angular/core';

const SNIPPETS = [
	'{ posts { id title } }',
	'query { user { name } }',
	'mutation { createPost }',
	'{ books { id } }',
	'subscription { onUpdate }',
	'query { me { id name } }',
	'mutation { deletePost($id: ID!) }',
	'{ todos { id done } }',
	'fragment UserFields on User { id name }',
	'mutation { updateProfile }',
];

interface TextParticle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	text: string;
	opacity: number;
	size: number;
	color: string;
	seed: number;
	burst: number;
}

@Component({
	selector: 'app-hero-particles',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './hero-particles.component.html',
	styleUrl: './hero-particles.component.scss',
})
export class HeroParticles {
	private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
	private readonly destroyRef = inject(DestroyRef);

	private particles: TextParticle[] = [];
	private mouseX = window.innerWidth / 2;
	private mouseY = window.innerHeight / 2;
	private rafId = 0;
	private spawnTimer = 0;
	private moveTimer = 0;

	constructor() {
		afterNextRender(() => this.init());
	}

	private init(): void {
		const canvas = this.canvasRef()?.nativeElement;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const resize = (): void => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
		resize();
		window.addEventListener('resize', resize);
		this.destroyRef.onDestroy(() => window.removeEventListener('resize', resize));

		const colors = ['rgba(0, 200, 255, VAR)', 'rgba(108, 92, 231, VAR)', 'rgba(255, 255, 255, VAR)'];

		for (let i = 0; i < 12; i++) {
			this.particles.push(this.spawn(canvas, colors));
		}

		window.addEventListener('mousemove', (e) => {
			this.mouseX = e.clientX;
			this.mouseY = e.clientY;
			this.moveTimer = 1;
		});

		window.addEventListener('mouseleave', () => {
			this.moveTimer = 0;
		});

		const animate = (): void => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			const cx = canvas.width / 2;
			const cy = canvas.height / 2 - 40;

			this.moveTimer *= 0.97;
			const isActive = this.moveTimer > 0.01;

			this.spawnTimer += 1;
			if (isActive && this.spawnTimer % 25 === 0) {
				const p = this.spawn(canvas, colors);
				const angle = Math.random() * Math.PI * 2;
				const speed = 2 + Math.random() * 3;
				p.vx = Math.cos(angle) * speed;
				p.vy = Math.sin(angle) * speed;
				p.burst = 1;
				this.particles.push(p);
			}

			for (const p of this.particles) {
				const dx = cx - p.x;
				const dy = cy - p.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (isActive) {
					if (p.burst > 0) {
						p.x += p.vx;
						p.y += p.vy;
						p.vx *= 0.96;
						p.vy *= 0.96;
						p.opacity *= 0.98;
						p.burst -= 0.02;
						if (p.burst < 0) p.burst = 0;
					} else {
						const speed = Math.min(1, 80 / Math.max(dist, 1));
						p.x += dx * speed * 0.035;
						p.y += dy * speed * 0.035;

						if (dist < 50) {
							p.opacity -= 0.02;
						} else {
							const targetOpacity = Math.min(0.7, Math.max(0.1, 1 - dist / 600));
							p.opacity += (targetOpacity - p.opacity) * 0.05;
						}
					}
				} else {
					const waveX = Math.sin(this.spawnTimer * 0.008 * (0.5 + p.seed * 0.2) + p.seed * 6) * 25;
					const waveY = Math.cos(this.spawnTimer * 0.008 * (0.4 + p.seed * 0.15) + p.seed * 4) * 18;
					const targetX = 100 + ((p.seed * 137.5) % (canvas.width - 200));
					const targetY = 80 + ((p.seed * 97.3) % (canvas.height - 160));
					p.x += (targetX + waveX - p.x) * 0.006;
					p.y += (targetY + waveY - p.y) * 0.006;

					const scatterDist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
					p.opacity += (0.25 + (1 - Math.min(1, scatterDist / 500)) * 0.3 - p.opacity) * 0.03;
				}

				if (p.opacity <= 0 || dist > canvas.width * 1.5) {
					Object.assign(p, this.spawnPos(canvas, colors));
					if (dist < 50) p.opacity = 0.6;
				}

				const alpha = Math.max(0, Math.min(1, p.opacity));
				if (alpha < 0.01) continue;

				ctx.font = `${p.size}px 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace`;
				ctx.fillStyle = p.color.replace('VAR', String(alpha));
				ctx.fillText(p.text, p.x, p.y);
			}

			if (this.particles.length > 35) {
				this.particles = this.particles.filter((p) => p.opacity > 0.05);
			}

			this.rafId = requestAnimationFrame(animate);
		};
		animate();

		this.destroyRef.onDestroy(() => cancelAnimationFrame(this.rafId));
	}

	private spawn(canvas: HTMLCanvasElement, colors: string[]): TextParticle {
		const base = this.spawnPos(canvas, colors);
		base.opacity = 0.6;
		return base;
	}

	private spawnPos(canvas: HTMLCanvasElement, colors: string[]): TextParticle {
		return {
			x: this.mouseX + (Math.random() - 0.5) * 60,
			y: this.mouseY + (Math.random() - 0.5) * 60,
			vx: 0,
			vy: 0,
			text: SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)],
			opacity: 0.1,
			size: 10 + Math.random() * 4,
			color: colors[Math.floor(Math.random() * colors.length)],
			seed: Math.random(),
			burst: 0,
		};
	}
}
