self.addEventListener("push", (event) => {
  let payload = {};
  try {
    const data = event.data ? event.data.json() : null;
    if (data && typeof data === "object" && !Array.isArray(data)) payload = data;
  } catch {
    payload = {};
  }

  const title = typeof payload.title === "string" ? payload.title : "Notula";
  const body = typeof payload.body === "string" ? payload.body : "You have a new notification.";
  const noteId =
    typeof payload.noteId === "string" && /^c[a-z0-9]{20,}$/i.test(payload.noteId)
      ? payload.noteId
      : null;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { noteId },
      tag: typeof payload.tag === "string" ? payload.tag : undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawNoteId = event.notification.data?.noteId;
  const noteId =
    typeof rawNoteId === "string" && /^c[a-z0-9]{20,}$/i.test(rawNoteId) ? rawNoteId : null;
  const target = new URL(noteId ? `/notes/${noteId}` : "/reminders", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        return existing.navigate(target).then((client) => client?.focus());
      }
      return self.clients.openWindow(target);
    }),
  );
});
