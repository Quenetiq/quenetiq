import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export interface NullDetectionInfo {
	type: 'null-value' | 'query-error';
	operationName?: string;
	path?: string;
	message: string;
}

const EXT_SOURCE = 'dumb-keystore-graphql-debug';

export function useEpicFetus(): Readonly<Ref<NullDetectionInfo | null>> {
	const event = ref<NullDetectionInfo | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;

	function handleMessage(e: MessageEvent): void {
		if (e.source !== window) return;
		const msg = e.data;
		if (!msg || msg.source !== EXT_SOURCE || msg.type !== 'null-detection') return;
		if (timer) return;

		event.value = msg.payload;

		timer = setTimeout(() => {
			event.value = null;
			timer = null;
		}, 6000);
	}

	onMounted(() => window.addEventListener('message', handleMessage));
	onUnmounted(() => {
		window.removeEventListener('message', handleMessage);
		if (timer) clearTimeout(timer);
	});

	return event as Readonly<Ref<NullDetectionInfo | null>>;
}
