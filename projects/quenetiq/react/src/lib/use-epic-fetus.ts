import { useCallback, useEffect, useRef, useState } from 'react';

export interface NullDetectionInfo {
	type: 'null-value' | 'query-error';
	operationName?: string;
	path?: string;
	message: string;
}

const EXT_SOURCE = 'dumb-keystore-graphql-debug';

export function useEpicFetus(): NullDetectionInfo | null {
	const [event, setEvent] = useState<NullDetectionInfo | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleMessage = useCallback((e: MessageEvent) => {
		if (e.source !== window) return;
		const msg = e.data;
		if (!msg || msg.source !== EXT_SOURCE || msg.type !== 'null-detection') return;
		if (timerRef.current) return;

		setEvent(msg.payload);

		timerRef.current = setTimeout(() => {
			setEvent(null);
			timerRef.current = null;
		}, 6000);
	}, []);

	useEffect(() => {
		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [handleMessage]);

	return event;
}
