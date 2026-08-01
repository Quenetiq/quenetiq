---
title: Epic Fetus
slug: epic-fetus
group: Features
order: 8
since: '1.0.5'
tags:
  - null-detection
  - overlay
description: Null detection overlay
---

# Epic Fetus

A dramatic null-detection animation inspired by _The Binding of Isaac_ — whenever GraphQL responds with `null` data or an error, a missile strikes the page. Because null values should never go unnoticed.

## What is Epic Fetus?

Epic Fetus is an optional **null detection animation** that triggers when GraphQL responses contain `null` values or errors. It plays a cinematic sequence directly in the browser:

1. **Reticle** — a pulsing crosshair locks onto the center of the page
2. **Warning line** — a red laser line appears from the top
3. **Missile** — a rocket drops from above and impacts the target
4. **Explosion** — a fireball with shockwave and smoke
5. **Debris** — glowing fragments scatter across the screen
6. **Overlay** — displays "NULL DETECTED" or "У ВАС ОШИБКА В КВЕРИ"

The sequence lasts ~6 seconds and then self-clears. Each null or error in a GraphQL response triggers a fresh sequence.

## How It Works

The **Quenetiq Browser Extension** intercepts every `fetch` and `XMLHttpRequest` to your GraphQL endpoint. If the response contains a `null` value or a GraphQL error, the extension emits a `window.postMessage({ source: 'dumb-keystore-graphql-debug', type: 'null-detection', ... })` event. The same script that intercepts the request also runs the animation — no framework hooks required.

Framework libraries (`@quenetiq/core`, `@quenetiq/react`, `@quenetiq/vue`) provide additional hooks and overlay components that listen for the same `postMessage` events but work independently of the extension.

## Framework Adapters

### Angular

Install `@quenetiq/core` and use the `NullOverlay` component with `provideNullDetection()`:

```typescript
import { provideNullDetection } from '@quenetiq/core';
import { NullOverlay } from '@quenetiq/core';

export const appConfig: ApplicationConfig = {
	providers: [provideNullDetection()],
};
```

The overlay appears at the app root and listens for null-detection events. It's optional — the extension handles the animation even without it.

### React

Use the `useEpicFetus` hook to react to null detections in React:

```typescript
import { useEpicFetus } from '@quenetiq/react';

function App() {
  const detection = useEpicFetus();

  return (
    <div>
      {detection && (
        <p>Null value at: {detection.path}</p>
      )}
    </div>
  );
}
```

### Vue

Use the `useEpicFetus` composable in Vue 3:

```html
<script setup>
	import { useEpicFetus } from '@quenetiq/vue';

	const detection = useEpicFetus();
</script>
```

## Disabling Epic Fetus

If the dramatic animation is not your style, there are several ways to disable it:

### 1. Don't register the provider (Angular)

Simply omit `provideNullDetection()` from your app config. No overlay, no middleware, no animation:

```typescript
// Angular — simply omit the provider:
import { provideGraphql } from '@quenetiq/core';

export const appConfig: ApplicationConfig = {
	providers: [
		// Don't call provideNullDetection() — no overlay, no middleware
		provideGraphql({ endpoint: '/graphql' }),
	],
};
```

### 2. Remove or disable the browser extension

The extension is the primary trigger. Uninstall it, or if the extension has a toggle, disable "Null detection animation":

```typescript
// In the browser extension popup, toggle:
// "Enable null detection animation" → OFF

// Or remove the extension entirely.
```

### 3. Ignore the CSS animation class

The animation elements use the `ef-*` class prefix. You can hide them globally:

```css
[class*='ef-'] {
	display: none !important;
}
```

### 4. Don't install — it ships only with the devtools extension

Epic Fetus is part of the **Quenetiq GraphQL Debugger** browser extension. If you never install the extension, you'll never see it.

## API Reference

Epic Fetus does not expose a public API. It is managed internally by the Quenetiq browser extension and framework adapters.

## Starters

:::stackblitz starter="angular"

:::stackblitz starter="react"

:::stackblitz starter="vue"

> NullOverlay shows a floating indicator when null fields are detected.
