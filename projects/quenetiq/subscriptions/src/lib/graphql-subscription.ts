interface WsMessage {
	type: string;
	id?: string;
	payload?: unknown;
}

interface SubscriptionCallbacks<T> {
	next: (data: T) => void;
	error: (err: Error) => void;
	complete: () => void;
}

const WS_PROTOCOL = 'graphql-transport-ws';
const CONNECTION_TIMEOUT = 10000;

const NOOP = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function

function defaultWsUrl(endpoint: string): string {
	return endpoint.replace(/^http/, 'ws');
}

export class GraphqlSubscription {
	constructor(private readonly endpoint: string) {}

	subscribe<T>(
		query: string,
		variables?: Record<string, unknown>,
		callbacks?: Partial<SubscriptionCallbacks<T>>,
	): () => void {
		const url = defaultWsUrl(this.endpoint);
		let ws: WebSocket;
		let completed = false;
		const subId =
			typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: 'sub_' + Math.random().toString(36).substring(2, 9);

		const emit = {
			next: callbacks?.next ?? NOOP,
			error: callbacks?.error ?? NOOP,
			complete: callbacks?.complete ?? NOOP,
		};

		try {
			ws = new WebSocket(url, WS_PROTOCOL);
		} catch (err) {
			emit.error(err instanceof Error ? err : new Error('WebSocket creation failed'));
			return NOOP;
		}

		const connTimeout = setTimeout(() => {
			if (!completed) {
				ws.close();
				emit.error(new Error('WebSocket connection timeout'));
			}
		}, CONNECTION_TIMEOUT);

		ws.onopen = () => {
			ws.send(JSON.stringify({ type: 'connection_init' }));
		};

		ws.onmessage = (event: MessageEvent) => {
			let msg: WsMessage;
			try {
				msg = JSON.parse(event.data) as WsMessage;
			} catch {
				return;
			}

			switch (msg.type) {
			case 'connection_ack': {
				clearTimeout(connTimeout);
				ws.send(
					JSON.stringify({
						type: 'subscribe',
						id: subId,
						payload: { query, variables },
					}),
				);
				break;
			}
			case 'next': {
				const payload = msg.payload as { data?: T; errors?: { message: string }[] };
				if (payload.errors && payload.errors.length > 0) {
					emit.error(new Error(payload.errors[0].message));
				} else if (payload.data !== undefined) {
					emit.next(payload.data);
				}
				break;
			}
			case 'error': {
				const payload = msg.payload as { message?: string };
				emit.error(new Error(payload?.message ?? 'Subscription error'));
				break;
			}
			case 'complete': {
				emit.complete();
				break;
			}
			}
		};

		ws.onerror = () => {
			emit.error(new Error('WebSocket connection failed'));
		};

		ws.onclose = () => {
			if (!completed) {
				emit.complete();
			}
		};

		return () => {
			completed = true;
			clearTimeout(connTimeout);
			if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
				ws.send(JSON.stringify({ type: 'complete', id: subId }));
				ws.close(1000);
			}
		};
	}
}
