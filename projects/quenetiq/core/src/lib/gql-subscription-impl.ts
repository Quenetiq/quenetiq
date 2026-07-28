/**
 * Minimal GraphQL WebSocket subscription client.
 * Used by subscribeTo() when the @quenetiq/subscriptions package is not installed.
 */
export class GqlSubscriptionWsClient {
	private ws: WebSocket | null = null;

	constructor(private readonly url: string) {}

	subscribe<T>(
		query: string,
		observers: { next: (data: T) => void; error: (err: unknown) => void; complete: () => void },
		variables?: Record<string, unknown>,
	): () => void {
		this.ws = new WebSocket(this.url);

		this.ws.onopen = () => {
			this.ws?.send(JSON.stringify({ type: 'connection_init', payload: {} }));
			this.ws?.send(JSON.stringify({
				id: '1',
				type: 'subscribe',
				payload: { query, variables },
			}));
		};

		this.ws.onmessage = (event: MessageEvent) => {
			try {
				const msg = JSON.parse(event.data as string) as {
					type: string;
					payload?: { data?: T };
				};
				if (msg.type === 'data' && msg.payload?.data) {
					observers.next(msg.payload.data);
				}
			} catch {
				// ignore parse errors
			}
		};

		this.ws.onerror = (err: Event) => observers.error(err);
		this.ws.onclose = () => observers.complete();

		return () => this.ws?.close();
	}
}
