import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import type { CacheEntity } from '@quenetiq/cache';
import { useClient } from './plugin';

export interface UseCacheEntityOptions {
	typename: string;
	id: string;
}

export interface UseCacheEntityResult<T extends CacheEntity = CacheEntity> {
	data: Ref<T | null>;
	loading: Ref<boolean>;
	error: Ref<string | null>;
	refetch: () => void;
}

/**
 * Vue composable that reads a normalized entity from the cache and re-renders
 * when the entity changes (write, merge, evict).
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { data, loading } = useCacheEntity({ typename: 'Todo', id: '1' });
 * </script>
 *
 * <template>
 *   <p v-if="loading">Loading...</p>
 *   <p v-else-if="data">{{ data.title }}</p>
 * </template>
 * ```
 */
export function useCacheEntity<T extends CacheEntity = CacheEntity>(
	options: UseCacheEntityOptions,
): UseCacheEntityResult<T> {
	const client = useClient();
	const cache = client.getCacheService();
	const { typename, id } = options;

	const data = ref<T | null>(null) as Ref<T | null>;
	const loading = ref(true);
	const error = ref<string | null>(null);

	const readEntity = (): void => {
		if (!cache) {
			loading.value = false;
			return;
		}

		try {
			const entity = cache.query(typename, id) as T | undefined;
			data.value = entity ?? null;
			error.value = null;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to read cache entity';
		} finally {
			loading.value = false;
		}
	};

	let unsubscribe: (() => void) | null = null;

	onMounted(() => {
		readEntity();

		if (!cache) return;

		unsubscribe = cache.events.on((event) => {
			if (event.type === 'write' || event.type === 'merge') {
				const entity = event.data.entity;
				if (entity.__typename === typename && entity.id === id) {
					readEntity();
				}
			} else if (event.type === 'evict') {
				if (event.data.typename === typename && event.data.id === id) {
					data.value = null;
				}
			}
		});
	});

	onUnmounted(() => {
		unsubscribe?.();
	});

	return { data, loading, error, refetch: readEntity };
}
