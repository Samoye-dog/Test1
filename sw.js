var CACHE_NAME = 'adr2-page-v1';

self.addEventListener('install', function(e) {
        e.waitUntil(
                caches.open(CACHE_NAME).then(function(cache) {
                        return Promise.all([
                                fetch('./', { cache: 'reload' }).then(function(resp) {
                                        if (resp && resp.ok) return cache.put('./', resp);
                                }).catch(function() {}),
                                fetch('./index.html', { cache: 'reload' }).then(function(resp) {
                                        if (resp && resp.ok) return cache.put('./index.html', resp);
                                }).catch(function() {})
                        ]);
                }).then(function() {
                        return self.skipWaiting();
                })
        );
});

self.addEventListener('activate', function(e) {
        e.waitUntil(
                caches.keys().then(function(keys) {
                        return Promise.all(keys.map(function(k) {
                                if (k !== CACHE_NAME) return caches.delete(k);
                        }));
                }).then(function() {
                        return self.clients.claim();
                })
        );
});

self.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'cache-now') {
                var reply = function(ok, err) {
                        if (e.ports && e.ports[0]) {
                                e.ports[0].postMessage({ ok: ok, error: err || null });
                        }
                };
                e.waitUntil(
                        caches.open(CACHE_NAME).then(function(cache) {
                                return fetch('./', { cache: 'reload' }).then(function(resp) {
                                        if (!resp || !resp.ok) {
                                                throw new Error('获取页面失败 (' + (resp ? resp.status : '无响应') + ')');
                                        }
                                        return cache.put('./', resp);
                                });
                        }).then(function() {
                                return caches.open(CACHE_NAME);
                        }).then(function(cache) {
                                return fetch('./index.html', { cache: 'reload' }).then(function(resp) {
                                        if (resp && resp.ok) return cache.put('./index.html', resp);
                                }).catch(function() {});
                        }).then(function() {
                                reply(true);
                        }).catch(function(err) {
                                reply(false, err && err.message ? err.message : String(err));
                        })
                );
        }
});

self.addEventListener('fetch', function(e) {
        var req = e.request;
        if (req.method !== 'GET') return;
        if (new URL(req.url).origin !== self.location.origin) return;
        e.respondWith(
                fetch(req, { cache: 'no-cache' }).then(function(resp) {
                        if (resp && resp.ok) {
                                var copy = resp.clone();
                                caches.open(CACHE_NAME).then(function(cache) {
                                        cache.put(req, copy);
                                }).catch(function() {});
                        }
                        return resp;
                }).catch(function() {
                        return caches.match(req).then(function(hit) {
                                if (hit) return hit;
                                return caches.match('./').then(function(idx) {
                                        if (idx) return idx;
                                        return caches.match('./index.html').then(function(alt) {
                                                if (alt) return alt;
                                                return new Response('offline and not cached', { status: 504, statusText: 'offline' });
                                        });
                                });
                        });
                })
        );
});
