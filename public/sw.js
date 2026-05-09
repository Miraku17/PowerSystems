// Service Worker for Power Systems Inc PWA
const CACHE_NAME = 'psi-forms-v2';
const STATIC_CACHE_NAME = 'psi-static-v2';
const API_CACHE_NAME = 'psi-api-v1';

// Static assets to cache on install (only public assets, not auth-protected pages)
const STATIC_ASSETS = [
  '/images/powersystemslogov1.jpg',
  '/images/powersystemslogov2.png',
];

// Pages to cache after user is authenticated
const PAGES_TO_CACHE = [
  '/dashboard',
  '/dashboard/overview',
  '/dashboard/fill-up-form',
  '/dashboard/pending-forms',
  '/dashboard/records',
  '/login',
];

// Authenticated API endpoints that are safe to cache for offline use
// (lookup-style data that any user with access reads as a list).
const API_GETS_TO_CACHE = [
  '/api/users',
  '/api/customers',
  '/api/engines',
];

// Pathname predicate — true if this request is one of the cacheable APIs.
const isCacheableApi = (url) =>
  url.origin === self.location.origin && API_GETS_TO_CACHE.some((p) => url.pathname === p);

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const CURRENT_CACHES = [CACHE_NAME, STATIC_CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !CURRENT_CACHES.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - network first, fallback to cache for navigation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external resources outright.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Stale-while-revalidate for the small allowlist of safe, lookup-style API
  // GETs. Mutations and auth endpoints are NOT cached.
  if (isCacheableApi(url)) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached); // offline: fall back to cache
        return cached || networkPromise;
      })
    );
    return;
  }

  // Skip every other API request (auth, mutations, anything that isn't on the
  // cacheable allowlist).
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // For navigation requests (HTML pages), use network-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache when offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cached response, try to return the dashboard page
            return caches.match('/dashboard');
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images), use cache-first strategy
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached response but also update cache in background
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          });
          return cachedResponse;
        }
        // No cache, fetch from network
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Cache authenticated pages when requested by the client
  if (event.data && event.data.type === 'CACHE_PAGES') {
    console.log('[SW] Caching authenticated pages...');
    caches.open(CACHE_NAME).then((cache) => {
      PAGES_TO_CACHE.forEach((page) => {
        fetch(page, { credentials: 'include' })
          .then((response) => {
            if (response.ok) {
              cache.put(page, response);
              console.log('[SW] Cached:', page);
            }
          })
          .catch((err) => {
            console.log('[SW] Failed to cache:', page, err);
          });
      });
    });
  }

  // Pre-warm the API cache for offline use. The client posts this when the
  // user explicitly clicks "Install for offline" so they know cache is ready
  // before they leave connectivity.
  if (event.data && event.data.type === 'WARM_OFFLINE_CACHE') {
    const port = event.ports && event.ports[0];
    const auth = event.data.token ? `Bearer ${event.data.token}` : null;
    const headers = auth ? { Authorization: auth } : undefined;

    const targets = [
      // Pages
      ...PAGES_TO_CACHE.map((p) => ({ kind: 'page', url: p, cache: CACHE_NAME })),
      // API GETs
      ...API_GETS_TO_CACHE.map((p) => ({ kind: 'api', url: p, cache: API_CACHE_NAME })),
    ];

    Promise.all(
      targets.map(async (t) => {
        try {
          const response = await fetch(t.url, {
            credentials: 'include',
            headers: t.kind === 'api' ? headers : undefined,
          });
          if (response.ok) {
            const cache = await caches.open(t.cache);
            await cache.put(t.url, response.clone());
            return { url: t.url, ok: true };
          }
          return { url: t.url, ok: false, status: response.status };
        } catch (err) {
          return { url: t.url, ok: false, error: String(err) };
        }
      })
    ).then((results) => {
      const ok = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      const summary = { ok, total: results.length, failed };
      console.log('[SW] Warm-cache summary:', summary);
      if (port) port.postMessage(summary);
    });
  }
});
