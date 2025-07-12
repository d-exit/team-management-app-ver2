// service-worker.js

const CACHE_NAME = 'team-management-pwa-cache-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
  // Note: Dynamically generated JS/CSS files will be handled by more advanced service workers.
  // This basic setup ensures the app shell is cached.
];

// Service Workerのインストール処理
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        // 基本的なファイルをキャッシュする
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// リクエストに対する応答
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // キャッシュ内に該当するリクエストがあれば、それを返す
        if (response) {
          return response;
        }
        // キャッシュになければ、ネットワークにリクエストしに行く
        return fetch(event.request);
      }
    )
  );
});

// 古いキャッシュの削除
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // ホワイトリストに含まれていないキャッシュは削除する
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});