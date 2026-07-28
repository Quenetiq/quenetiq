/* eslint-disable @typescript-eslint/no-empty-function */

interface SubscriptionCallbacks<T> {
	next: (data: T) => void;
	error: (err: Error) => void;
	complete: () => void;
}

interface WsMessage {
	type: string;
	id?: string;
	payload?: unknown;
}

interface GraphQLResponse<T> {
	data?: T;
	errors?: { message: string }[];
}

const WS_PROTOCOL = 'graphql-transport-ws';
const CONNECTION_TIMEOUT = 10000;

function defaultWsUrl(endpoint: string): string {
	return endpoint.replace(/^http/, 'ws');
}

export class GraphqlLiveQuery {
	constructor(private readonly endpoint: string) {}

	async execute<T>(
		query: string,
		variables?: Record<string, unknown>,
		callbacks?: Partial<SubscriptionCallbacks<T>>,
	): Promise<() => void> {
		const emit = {
			next: callbacks?.next ?? (() => {}),
			error: callbacks?.error ?? (() => {}),
			complete: callbacks?.complete ?? (() => {}),
		};

		try {
			const response = await fetch(this.endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query, variables }),
			});

			if (!response.ok) {
				emit.error(new Error(`HTTP ${response.status}`));
				return () => {};
			}

			const json = (await response.json()) as GraphQLResponse<T>;

			if (json.errors && json.errors.length > 0) {
				emit.error(new Error(json.errors[0].message));
				return () => {};
			}

			if (json.data !== undefined) {
				emit.next(json.data);
			}
		} catch (err) {
			emit.error(err instanceof Error ? err : new Error('Live query fetch failed'));
			return () => {};
		}

		return this.subscribeToUpdates<T>(query, variables, emit);
	}

	private subscribeToUpdates<T>(
		query: string,
		variables?: Record<string, unknown>,
		emit?: SubscriptionCallbacks<T>,
	): () => void {
		const url = defaultWsUrl(this.endpoint);
		let ws: WebSocket;
		let completed = false;
		const subId =
			typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: 'sub_' + Math.random().toString(36).substring(2, 9);

		const { next, error, complete } = emit ?? {
			next: () => {},
			error: () => {},
			complete: () => {},
		};

		try {
			ws = new WebSocket(url, WS_PROTOCOL);
		} catch (err) {
			error(err instanceof Error ? err : new Error('WebSocket creation failed'));
			return () => {};
		}

		const connTimeout = setTimeout(() => {
			if (!completed) {
				ws.close();
				error(new Error('WebSocket connection timeout'));
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
					error(new Error(payload.errors[0].message));
				} else if (payload.data !== undefined) {
					next(payload.data);
				}
				break;
			}
			case 'error': {
				const payload = msg.payload as { message?: string };
				error(new Error(payload?.message ?? 'Subscription error'));
				break;
			}
			case 'complete': {
				complete();
				break;
			}
			}
		};

		ws.onerror = () => {
			error(new Error('WebSocket connection failed'));
		};

		ws.onclose = () => {
			if (!completed) {
				complete();
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
