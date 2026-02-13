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
  registration.active?.postMessage({
    type: 'SHOW_LOCKSCREEN_COUNTER',
    payload,
  });
}

export async function clearProjectCounterNotification(projectId: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({
    type: 'CLEAR_LOCKSCREEN_COUNTER',
    payload: { projectId },
  });
}
