---
title: 'Cache Migration'
slug: cache-migration
group: 'Core'
order: 12
since: '1.0.0'
tags: [cache, migration, version]
description: 'Version migration for cached data'
---

# Cache Migration

`CachePersistConfig.migrate` lets you transform persisted data when the `version` changes.

```typescript
import { CachePersistence } from '@quenetiq/cache';

const persist = new CachePersistence({
	storageKey: 'my_cache',
	version: 'v3',
	migrate(data, storedVersion) {
		if (storedVersion === 'v1') {
			// v1 → v2: rename field
			for (const [, entity] of data) {
				if ('oldName' in entity) {
					entity.newName = entity.oldName;
					delete entity.oldName;
				}
			}
		}
		if (storedVersion === 'v2') {
			// v2 → v3: add defaults
		}
		return data;
	},
});
```

## How It Works

1. On `restore()`, the stored `version` is compared to the current `version`
2. If they differ, the `migrate` callback is called with the stored data and the stored version string
3. The callback transforms the data and returns it
4. The transformed data is saved back with the new version

This enables seamless cache upgrades when your data schema changes between app versions.
