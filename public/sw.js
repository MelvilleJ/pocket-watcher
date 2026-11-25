// Pocket Watcher service worker: receives web push notifications for transactions waiting for review.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      data: { url: data.url, actions: data.actions || [] },
      actions: (data.actions || []).map((a) => ({ action: a.action, title: a.title })),
    })
  );
});

async function openApp(url) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    if (new URL(client.url).origin === self.location.origin && "focus" in client) {
      await client.navigate(url);
      return client.focus();
    }
  }
  return self.clients.openWindow(url);
}

async function runAction(notification, actionName) {
  const action = notification.data.actions.find((a) => a.action === actionName);
  if (!action) return openApp(notification.data.url);
  try {
    const response = await fetch("/api/push/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: action.token }),
    });
    const result = await response.json();
    // Anything other than a clean add/dismiss (e.g. a category is now missing) needs a person to look.
    if (!result.ok && result.outcome !== "already-handled") return openApp(notification.data.url);
  } catch {
    return openApp(notification.data.url);
  }
}

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  notification.close();
  if (event.action) {
    event.waitUntil(runAction(notification, event.action));
  } else {
    event.waitUntil(openApp(notification.data.url));
  }
});
