import { InjectionToken } from '@angular/core';

export interface SubscriptionsConfig {
	wsUrl?: string;
	connectionParams?: () => Record<string, unknown>;
	reconnect?: boolean;
	reconnectInterval?: number;
	maxReconnectAttempts?: number;
}

export const SUBSCRIPTIONS_CONFIG = new InjectionToken<SubscriptionsConfig | null>('SUBSCRIPTIONS_CONFIG');
