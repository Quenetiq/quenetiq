---
title: Sandboxes
slug: devcontainers
group: Environment
order: 1
since: 0.0.1
tags: [codespaces, stackblitz]
description: Online development environments
---

# Sandboxes

Try Quenetiq online (React/Vue) or locally via Dev Containers. Each sandbox includes a mock GraphQL endpoint and a minimal app that queries it using `@quenetiq/*` packages.

## Demos

Demo apps are available on GitHub. Clone the repo and run the demo of your choice locally:

| Demo | Stack | Run |
| --- | --- | --- |
| React | Vite + React 19 + `@quenetiq/react` | Open in StackBlitz · `git clone` + `cd demos/react && npm start` |
| Vue | Vite + Vue 3 + `@quenetiq/vue` | Open in StackBlitz · `git clone` + `cd demos/vue && npm start` |

## Starters

Minimal scaffold projects to kickstart a new app. Each starter includes `@quenetiq/*` packages and a mock GraphQL endpoint:

| Starter | Stack | Run |
| --- | --- | --- |
| Angular | Standalone Angular 22 + `provideQuenetiq` + `QuenetiqQuery` | Open in StackBlitz · [View on GitHub](https://github.com/Quenetiq/quenetiq/tree/main/starters/angular) · [Open in Codespaces](https://codespaces.new/Quenetiq/quenetiq?devcontainer_path=.devcontainer%2Fangular%2Fdevcontainer.json) |
| React | React 18 + `@quenetiq/react` + `useQuery` | Open in StackBlitz · [Open in Codespaces](https://codespaces.new/Quenetiq/quenetiq?devcontainer_path=.devcontainer%2Freact%2Fdevcontainer.json) |
| Vue | Vue 3 + `@quenetiq/vue` + `useQuery` | Open in StackBlitz · [Open in Codespaces](https://codespaces.new/Quenetiq/quenetiq?devcontainer_path=.devcontainer%2Fvue%2Fdevcontainer.json) |

## VS Code Dev Containers

For local development with Docker, open in GitHub Codespaces or use VS Code Dev Containers:

| Sandbox | Config | Ports |
| --- | --- | --- |
| Angular | `.devcontainer/angular/devcontainer.json` | 4200 + 4000 |
| React | `.devcontainer/react/devcontainer.json` | 5173 + 4000 |
| Vue | `.devcontainer/vue/devcontainer.json` | 5173 + 4000 |

```bash
# Open in GitHub Codespaces (just add "codespaces.new/" before the repo URL):
# https://codespaces.new/Quenetiq/quenetiq

# Or use VS Code Dev Containers locally:
# 1. Open the config directory in VS Code
code .devcontainer/angular/

# 2. Press Ctrl+Shift+P → "Dev Containers: Reopen in Container"
# VS Code builds the container, installs deps, and starts both servers.
```

## Source Code

Demo apps live in the `demos/` directory:

- `demos/angular/` — Angular + standalone components demo
- `demos/react/` — React + Vite demo
- `demos/vue/` — Vue + Vite demo
