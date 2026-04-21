# Proxy — Technical Documentation

## Purpose

The proxy is a **CORS bypass layer**. Browsers block cross-origin `fetch()` requests unless the
remote server opts in with `Access-Control-Allow-Origin` headers. Many GraphQL APIs don't do this.
The proxy routes every GraphQL request through a SvelteKit server endpoint so the actual
cross-origin call is made server-side, where CORS rules don't apply.

---

## File Map

| File | Role |
|---|---|
| `src/lib/stores/proxySettingsStore.ts` | Persisted config store + URL helper |
| `src/routes/api/proxy/+server.ts` | Server-side proxy endpoint |
| `src/lib/components/ProxySettings.svelte` | Modal config dialog |
| `src/lib/components/ProxySettingsInline.svelte` | Compact sidebar toggle |
| `src/lib/components/MainWraper.svelte` | Applies proxy to the URQL GraphQL client |
| `src/lib/components/EndpointForm.svelte` | Applies proxy to connection tests |
| `src/lib/utils/healthCheck.ts` | Applies proxy to health checks |

---

## 1. Configuration Store (`proxySettingsStore.ts`)

```ts
export interface ProxySettings {
  enabled: boolean;   // on/off toggle
  proxyUrl: string;   // default: "/api/proxy"
}

export const proxySettings = persisted<ProxySettings>('proxySettings', {
  enabled: false,
  proxyUrl: '/api/proxy'
});
```

State is stored in **`localStorage`** under the key `proxySettings` via `svelte-persisted-store`.
It survives page reloads without any backend.

### `getProxiedUrl(targetUrl)`

```ts
export const getProxiedUrl = (targetUrl: string): string => {
  const s = get(proxySettings);
  if (!s.enabled || !s.proxyUrl) return targetUrl;
  return `${s.proxyUrl.replace(/\/$/, '')}?target=${encodeURIComponent(targetUrl)}`;
};
```

- Proxy **disabled** → returns `targetUrl` unchanged.
- Proxy **enabled** → returns `{proxyUrl}?target={encodedTargetUrl}`.

**Example:**
```
Input:  "https://api.example.com/graphql"
Output: "/api/proxy?target=https%3A%2F%2Fapi.example.com%2Fgraphql"
```

The target is `encodeURIComponent`-encoded so it survives URL parsing on the server side. A
trailing slash on `proxyUrl` is stripped to avoid double slashes.

---

## 2. Server-Side Proxy Endpoint (`src/routes/api/proxy/+server.ts`)

A SvelteKit `+server.ts` route that handles `POST` and `OPTIONS`.

### Full source

```ts
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
  const targetUrl = url.searchParams.get('target');
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing target URL' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const skip = new Set([
    'host', 'connection', 'transfer-encoding',
    'te', 'trailer', 'upgrade', 'origin'
  ]);
  const forwardHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (!skip.has(key.toLowerCase())) forwardHeaders[key] = value;
  });

  const body = await request.arrayBuffer();
  const upstream = await fetch(targetUrl, { method: 'POST', headers: forwardHeaders, body });
  const responseBody = await upstream.arrayBuffer();

  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'access-control-allow-origin': '*'
    }
  });
};

export const OPTIONS: RequestHandler = async () =>
  new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': '*'
    }
  });
```

### Step-by-step POST flow

| Step | Detail |
|---|---|
| **1. Extract target** | `url.searchParams.get('target')` — returns `400` if missing |
| **2. Filter headers** | Strips hop-by-hop headers that must not be forwarded (`host`, `connection`, `transfer-encoding`, `te`, `trailer`, `upgrade`, `origin`). All other headers (e.g. `authorization`, `content-type`, custom headers) are passed through unchanged. |
| **3. Read body** | `request.arrayBuffer()` — binary-safe, works for any content-type, not just JSON |
| **4. Forward request** | `fetch(targetUrl, { method: 'POST', headers: forwardHeaders, body })` — same-method, same-body, filtered headers |
| **5. Read response** | `upstream.arrayBuffer()` — again binary-safe |
| **6. Return to browser** | Upstream `status` code preserved; `content-type` taken from upstream (fallback: `application/json`); **`access-control-allow-origin: *`** added — this is the header that satisfies the browser's CORS check |

### Why hop-by-hop headers are stripped

| Header | Reason to strip |
|---|---|
| `host` | Must reflect the upstream host, not the SvelteKit server |
| `connection` | HTTP/1.1 connection management; meaningless across two separate connections |
| `transfer-encoding` | Encoding negotiated per-connection; body is already decoded |
| `te` | Transfer encoding extensions; same reason |
| `trailer` | HTTP trailer fields; not relevant after body is fully buffered |
| `upgrade` | WebSocket / protocol upgrade; not supported here |
| `origin` | Would expose the app's origin to the upstream, potentially triggering CORS on it |

### OPTIONS handler (CORS preflight)

Browsers send a `OPTIONS` preflight before a cross-origin `POST`. The handler returns:

```
access-control-allow-origin: *
access-control-allow-methods: POST, OPTIONS
access-control-allow-headers: *
```

`access-control-allow-headers: *` means any request header is permitted, which is needed
because GraphQL clients send custom headers like `Authorization`.

---

## 3. Client Integration

### URQL GraphQL client (`MainWraper.svelte`)

```ts
// url is resolved once at client creation time
const client = createClient({
  url: getProxiedUrl(endpointInfo?.url || ''),
  ...
});

// reactive: recreate client whenever proxy settings change
$effect(() => {
  if ($proxySettings) {
    // new client with updated URL
  }
});
```

`getProxiedUrl()` is called at **client creation**. Whenever `$proxySettings` changes (toggle or
URL edit), the `$effect` recreates the URQL client with the new URL — no page reload required.

### Endpoint connection test (`EndpointForm.svelte`)

```ts
const testUrl = getProxiedUrl(url);
const result = await fetch(testUrl, {
  method: 'POST',
  body: JSON.stringify({ query: '{ __typename }' })
});
```

The connection test routes through the proxy too, so it reflects what the actual client will do.

### Health checks (`healthCheck.ts`)

```ts
const proxiedUrl = getProxiedUrl(endpointUrl);
// sends { __typename } query, measures latency
```

---

## 4. Full Request Flow (proxy enabled)

```
Browser
  │
  │  POST /api/proxy?target=https%3A%2F%2Fapi.example.com%2Fgraphql
  │  Headers: content-type: application/json, authorization: Bearer ...
  │  Body: { "query": "{ users { id name } }" }
  │
  ▼
SvelteKit server  [src/routes/api/proxy/+server.ts]
  │
  │  Strip: host, connection, transfer-encoding, te, trailer, upgrade, origin
  │  Keep:  content-type, authorization, ...
  │
  │  POST https://api.example.com/graphql     ← actual cross-origin request
  │  Headers: (filtered)
  │  Body: { "query": "{ users { id name } }" }
  │
  ▼
Remote GraphQL API
  │
  │  200 OK
  │  content-type: application/json
  │  Body: { "data": { "users": [...] } }
  │
  ▼
SvelteKit server
  │
  │  Add: access-control-allow-origin: *
  │  Preserve: status 200, content-type
  │
  ▼
Browser  ←  sees a same-origin response, CORS check passes
```

---

## 5. UI Components

### ProxySettings.svelte (modal)

- Opens from the sidebar router icon.
- Local `$state` variables `tempEnabled` / `tempUrl` buffer edits — only committed to the store on
  **Save**, so cancelling discards changes.
- Syncs from store when modal opens via `$effect(() => { if (show) { ... } })`.

### ProxySettingsInline.svelte (sidebar)

- Compact toggle + URL input rendered directly in the sidebar.
- Updates the store **immediately** on change (no buffer), so the proxy toggles in real time.
- Router icon colour: `text-primary` when enabled, `text-base-content/50` when disabled.

---

## 6. Key Design Decisions

| Decision | Reason |
|---|---|
| `?target=` query param (not path segment) | No extra catch-all route config needed in SvelteKit |
| `ArrayBuffer` for body relay | Binary-safe; works for multipart, binary, or plain JSON payloads |
| `access-control-allow-origin: *` on response | Satisfies browser CORS check for any origin |
| Custom `proxyUrl` field | Lets users point to an **external** CORS proxy (e.g. `https://cors-anywhere.herokuapp.com`) instead of the built-in one |
| `svelte-persisted-store` to localStorage | Zero backend config; survives page reloads; portable |
| URQL client recreated on settings change | Ensures all in-flight and future requests use the updated proxy URL instantly |
