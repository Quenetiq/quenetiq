---
title: '@quenetiq/observables'
slug: observables
group: 'Core'
order: 4
since: '1.0.6-beta'
tags: [observables, rxjs, cache]
description: 'RxJS operators for cache observation'
---

# @quenetiq/observables

RxJS operators and utilities for reactive cache observation. Provides observable streams that emit cache state changes for entities and queries.

## Installation

```bash
npm install @quenetiq/observables
```

## Features

| Feature                                        | Description                                  |
| ---------------------------------------------- | -------------------------------------------- |
| [observeEntity](observe-entity)                | Watch a single cache entity by typename + id |
| [observeQuery](observe-query)                  | Watch a cached query result by query hash    |
| [cacheFirst](cache-first)                      | Cache-first strategy with network fetch      |
| [staleWhileRevalidate](stale-while-revalidate) | Stale-while-revalidate strategy              |
| [watchQuery](watch-query)                      | Combined fetch + cache observation           |
| [asCache](as-cache)                            | Reactive cache reader                        |
| [invalidateOn](invalidate-on)                  | Pipeable invalidation operator               |
| [readHash](read-hash)                          | Direct cache entity reader                   |
| [lastValueFromCache](last-value-from-cache)    | Promise-based cache reader                   |
