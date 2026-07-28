# Privacy Policy for Quenetiq GraphQL Debugger

**Last updated:** 2026-06-28

## Data Collection

This extension captures GraphQL API requests (queries, mutations, and
subscriptions) made by the pages you visit while DevTools is open. Captured
data includes:

- Request URL, method, headers, and body
- Response status, body, and duration
- WebSocket messages for GraphQL subscriptions

## Data Storage

All captured data is stored **locally** in your browser using
`chrome.storage.local`. Data is kept only for the current browsing session and
is automatically discarded when the limit of 500 requests is reached. Older
entries are removed as new ones arrive.

## Data Sharing

This extension **does not** send any captured data to external servers. All
processing happens entirely within your browser. No analytics, telemetry, or
third-party services are used.

## Data Export

You may manually export captured data as a JSON file using the "Export" button
in the DevTools panel. This is a user-initiated action.

## Permissions

- **`storage`**: Used solely to persist GraphQL request data locally within
  the extension.
- **`activeTab`**: Used to access the currently active tab for debugging
  purposes.
- **`http://*/*` / `https://*/*`**: Required to intercept and display GraphQL
  network requests from any website you choose to debug.

## Contact

For questions about this privacy policy, open an issue at:
https://github.com/Quenetiq/quenetiq
