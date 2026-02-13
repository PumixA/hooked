export interface ProjectCounterNotificationPayload {
  projectId: string;
  projectTitle: string;
  currentRow: number;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  return Notification.requestPermission();
}

export async function showProjectCounterNotification(payload: ProjectCounterNotificationPayload): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker.ready;
  const options = {
    body: payload.projectTitle,
    tag: `hooked-project-${payload.projectId}`,
    requireInteraction: true,
    actions: [
      { action: 'increment-row', title: '+' },
      { action: 'decrement-row', title: '-' },
    ],
    icon: '/pwa-192x192.png',
    badge: '/logo-mini.svg',
  } as NotificationOptions;

  await registration.showNotification(`Rang ${payload.currentRow}`, options);
}

export async function clearProjectCounterNotification(projectId: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({
    type: 'CLEAR_LOCKSCREEN_COUNTER',
    payload: { projectId },
  });
}
