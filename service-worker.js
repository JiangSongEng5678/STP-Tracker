// service-worker.js

// Caching logic to make the app work offline
const CACHE_NAME = 'amway-tracker-v3'; // Increment version if you make changes
const urlsToCache = [
  '/',
  '/index.html',
  '/images/icon-192x192.png', 
  '/images/icon-512x512.png'  
  // Add other essential files like CSS or main JS if you split them
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});


// --- PUSH NOTIFICATION LOGIC ---
// This part listens for a push message from the server
self.addEventListener('push', event => {
    const data = event.data.json(); // Get the data sent from the Netlify Function
    
    const options = {
        body: data.body,
        icon: 'images/icon-192x192.png' // Icon to show in the notification
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});