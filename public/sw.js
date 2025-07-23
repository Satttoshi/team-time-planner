console.log('Service worker loaded');

// Test notification capability on install
self.addEventListener('install', function () {
  console.log('Service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  console.log('Service worker activated');
  // Test if we can show notifications
  event.waitUntil(
    self.registration
      .showNotification('Service Worker Active', {
        body: 'Service worker is now active and ready for push notifications',
        icon: '/next.svg',
        tag: 'sw-test',
      })
      .catch(err => console.error('Cannot show test notification:', err))
  );
});

// Handle skip waiting message
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', function (event) {
  console.log('🔔 Push event received in service worker:', event);

  if (event.data) {
    console.log('Push event has data');
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/next.svg',
      badge: data.badge || '/next.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1',
        url: data.data?.url || '/',
      },
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/next.svg',
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/next.svg',
        },
      ],
      requireInteraction: true,
      tag: 'team-time-planner-notification',
    };

    console.log('Showing notification with options:', options);
    event.waitUntil(self.registration.showNotification(data.title, options));
  } else {
    console.log('Push event has no data');
  }
});

self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received.');

  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
  }
});

self.addEventListener('notificationclose', function (event) {
  console.log('Notification was closed', event);
});
