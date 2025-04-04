// Service Worker for Push Notifications
self.addEventListener('push', (event) => {
  let payload;
  try {
    payload = event.data.json();
  } catch (_) {
    payload = {
      title: 'New Message',
      body: event.data.text()
    };
  }

  const options = {
    body: payload.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      ...payload.data,
      dateOfArrival: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Open Chat'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'New Message', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.data);
  event.notification.close();

  // Extract senderId from notification data
  const senderId = event.notification.data?.senderId;
  const baseUrl = self.location.origin;
  
  // Create URL with query parameter to open the specific chat
  const urlToOpen = senderId ? `${baseUrl}/?userId=${senderId}` : baseUrl;
  console.log('Opening URL:', urlToOpen);

  event.waitUntil(
    // clients is a global in service workers
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to find an existing window and focus it
      for (const client of clientList) {
        if (client.url.includes(baseUrl) && 'focus' in client) {
          return client.focus().then(() => {
            // Navigate to the chat with this user
            if (senderId && client.url !== urlToOpen) {
              return client.navigate(urlToOpen);
            }
          });
        }
      }
      // If no existing window, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});