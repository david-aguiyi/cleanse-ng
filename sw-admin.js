// cleanse.ng Admin Service Worker — Background Notification Support
const SW_VERSION = '1.0.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Listen for messages from the main thread to show notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, data } = event.data;
    self.registration.showNotification(title, {
      body: body || '',
      icon: icon || '🧹',
      badge: '🧹',
      tag: tag || 'cleanse-reminder',
      renotify: true,
      requireInteraction: event.data.urgent || false,
      data: data || {}
    });
  }
});

// Handle notification click — focus the admin tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing admin tab
      for (const client of clientList) {
        if (client.url.includes('admin.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // If no admin tab found, open one
      if (clients.openWindow) {
        return clients.openWindow('./admin.html');
      }
    })
  );
});
