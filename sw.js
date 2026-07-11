// 集站 Service Worker - 离线缓存
var CACHE_VERSION = 'jizhan-v1';
var APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/classifier.js',
  './js/htmlGenerator.js',
  './js/linkChecker.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.json'
];

// 安装：预缓存 App Shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.addAll(APP_SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_VERSION;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 请求：缓存优先，网络回退
self.addEventListener('fetch', function(e) {
  // 只处理 GET 请求
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        // 后台更新缓存
        fetch(e.request).then(function(resp) {
          if (resp && resp.status === 200) {
            caches.open(CACHE_VERSION).then(function(cache) {
              cache.put(e.request, resp.clone());
            });
          }
        }).catch(function() {});
        return cached;
      }
      // 不在缓存中，从网络获取
      return fetch(e.request).then(function(resp) {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') {
          return resp;
        }
        var respClone = resp.clone();
        caches.open(CACHE_VERSION).then(function(cache) {
          cache.put(e.request, respClone);
        });
        return resp;
      }).catch(function() {
        // 离线且无缓存，返回首页
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
