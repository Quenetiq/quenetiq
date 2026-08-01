import { Injectable, inject, isDevMode, ENVIRONMENT_INITIALIZER, type Provider, type OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, type Observable } from 'rxjs';
import { QUENETIQ_CONFIG, type QuenetiqConfig } from './quenetiq-config';
import { SchemaService } from './schema.service';

export interface SchemaChangedEvent {
	sdl: string;
	timestamp: number;
}

export interface SchemaErrorEvent {
	message: string;
	timestamp: number;
}

export type SchemaConnectionStatus = 'disconnected' | 'connecting' | 'connected';

@Injectable()
export class SchemaWatchService implements OnDestroy {
	readonly schemaChanged$ = new Subject<SchemaChangedEvent>();
	readonly schemaError$ = new Subject<SchemaErrorEvent>();
	readonly connectionStatus$ = new BehaviorSubject<SchemaConnectionStatus>('disconnected');

	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private destroy = false;
	private readonly config: QuenetiqConfig | null;
	private readonly schemaService: SchemaService;

	constructor() {
		this.config = inject(QUENETIQ_CONFIG, { optional: true }) ?? null;
		this.schemaService = inject(SchemaService, { optional: true }) as SchemaService;
	}

	connect(url?: string): void {
		if (this.destroy) return;
		this.disconnect();

		const wsUrl = url ?? this.resolveWsUrl();
		if (!wsUrl) return;

		this.connectionStatus$.next('connecting');

		try {
			this.ws = new WebSocket(wsUrl);

			this.ws.onopen = () => {
				this.connectionStatus$.next('connected');
			};

			this.ws.onmessage = (event: MessageEvent) => {
				try {
					const msg = JSON.parse(event.data);
					if (msg.type === 'schema-changed') {
						this.schemaChanged$.next(msg.data as SchemaChangedEvent);
						if (this.schemaService) {
							this.schemaService.load();
						}
					} else if (msg.type === 'schema-error') {
						this.schemaError$.next(msg.data as SchemaErrorEvent);
					}
				} catch {
					// ignore malformed messages
				}
			};

			this.ws.onclose = () => {
				this.ws = null;
				this.connectionStatus$.next('disconnected');
				this.scheduleReconnect();
			};

			this.ws.onerror = () => {
				this.ws?.close();
			};
		} catch {
			this.connectionStatus$.next('disconnected');
		}
	}

	disconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.ws) {
			this.ws.onclose = null;
			this.ws.close();
			this.ws = null;
		}
		this.connectionStatus$.next('disconnected');
	}

	onSchemaChanged(): Observable<SchemaChangedEvent> {
		return this.schemaChanged$.asObservable();
	}

	onSchemaError(): Observable<SchemaErrorEvent> {
		return this.schemaError$.asObservable();
	}

	ngOnDestroy(): void {
		this.destroy = true;
		this.disconnect();
		this.schemaChanged$.complete();
		this.schemaError$.complete();
		this.connectionStatus$.complete();
	}

	private resolveWsUrl(): string | null {
		const endpoint = this.config?.endpoint;
		if (!endpoint) return null;

		try {
			const url = new URL(endpoint);
			const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
			const port = url.port || (url.protocol === 'https:' ? 443 : 80);
			const wsPort = port === '443' || port === '80' ? 4000 : Number(port);
			return `${wsProtocol}//${url.hostname}:${wsPort}/schema-ws`;
		} catch {
			return null;
		}
	}

	private scheduleReconnect(): void {
		if (this.destroy) return;
		if (this.reconnectTimer) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, 5000);
	}
}

export function provideSchemaWatch(config?: { wsUrl?: string }): Provider[] {
	return [
		SchemaWatchService,
		{
			provide: ENVIRONMENT_INITIALIZER,
			multi: true,
			useFactory: () => {
				const svc = inject(SchemaWatchService);
				if (isDevMode()) {
					svc.connect(config?.wsUrl);
				}
				return svc;
			},
		},
	];
}
