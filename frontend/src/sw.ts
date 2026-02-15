/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

interface ShowLockscreenCounterMessage {
  type: 'SHOW_LOCKSCREEN_COUNTER';
  payload: {
    projectId: string;
    projectTitle: string;
    currentRow: number;
  };
}

interface ClearLockscreenCounterMessage {
  type: 'CLEAR_LOCKSCREEN_COUNTER';
  payload: {
    projectId: string;
  };
}

type LockscreenMessage = ShowLockscreenCounterMessage | ClearLockscreenCounterMessage;

const activeCounters = new Map<string, { projectTitle: string; currentRow: number }>();

function projectUrl(projectId: string): string {
  return new URL(`/#/projects/${projectId}`, self.location.origin).toString();
}

async function showCounterNotification(projectId: string, projectTitle: string, currentRow: number): Promise<void> {
  await self.registration.showNotification(`RANG ${currentRow}`, {
    body: projectTitle,
    tag: `hooked-project-${projectId}`,
    requireInteraction: true,
    renotify: true,
    timestamp: Date.now(),
    data: { projectId, projectTitle, currentRow },
    actions: [
      { action: 'increment-row', title: 'AJOUTER +1' },
      { action: 'decrement-row', title: 'RETIRER -1' },
    ],
    icon: '/pwa-192x192.png',
    badge: '/logo-mini.svg',
  } as NotificationOptions);
}

async function openProjectClient(projectId: string): Promise<WindowClient | null> {
  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  const targetClient = clientList[0] as WindowClient | undefined;
  const url = projectUrl(projectId);

  if (targetClient) {
    try {
      await targetClient.focus();
      if ('navigate' in targetClient) {
        await targetClient.navigate(url);
      }
      return targetClient;
    } catch {
      // Fallback handled below.
    }
  }

  const openedClient = await self.clients.openWindow(url);
  return openedClient ?? null;
}

async function deliverActionToClient(projectId: string, type: 'LOCKSCREEN_INCREMENT_ROW' | 'LOCKSCREEN_DECREMENT_ROW'): Promise<void> {
  const client = await openProjectClient(projectId);
  client?.postMessage({ type, projectId });
}

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const message = event.data as LockscreenMessage;

  if (!message) return;

  if (message.type === 'CLEAR_LOCKSCREEN_COUNTER') {
    const { projectId } = message.payload;
    activeCounters.delete(projectId);

    event.waitUntil(
      self.registration
        .getNotifications({ tag: `hooked-project-${projectId}` })
        .then((notifications) => notifications.forEach((notification) => notification.close())),
    );
    return;
  }

  if (message.type !== 'SHOW_LOCKSCREEN_COUNTER') return;

  const { projectId, projectTitle, currentRow } = message.payload;
  activeCounters.set(projectId, { projectTitle, currentRow });

  event.waitUntil(
    showCounterNotification(projectId, projectTitle, currentRow),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  const data = event.notification.data as { projectId?: string; projectTitle?: string; currentRow?: number } | undefined;
  const projectId = data?.projectId;

  if (!projectId) {
    return;
  }

  if (!event.action) {
    event.waitUntil((async () => {
      await openProjectClient(projectId);
      const counters = activeCounters.get(projectId);
      if (counters) {
        await showCounterNotification(projectId, counters.projectTitle, counters.currentRow);
      }
    })());
    return;
  }

  const eventType = event.action === 'increment-row'
    ? 'LOCKSCREEN_INCREMENT_ROW'
    : event.action === 'decrement-row'
      ? 'LOCKSCREEN_DECREMENT_ROW'
      : null;

  if (!eventType) return;

  const current = activeCounters.get(projectId) ?? {
    projectTitle: data?.projectTitle ?? 'Hooked',
    currentRow: data?.currentRow ?? 0,
  };
  const nextRow = eventType === 'LOCKSCREEN_INCREMENT_ROW'
    ? current.currentRow + 1
    : Math.max(0, current.currentRow - 1);
  activeCounters.set(projectId, { ...current, currentRow: nextRow });

  event.waitUntil(
    (async () => {
      await deliverActionToClient(projectId, eventType);
      await showCounterNotification(projectId, current.projectTitle, nextRow);
    })(),
  );
});

self.addEventListener('notificationclose', (event: NotificationEvent) => {
  const data = event.notification.data as { projectId?: string } | undefined;
  const projectId = data?.projectId;
  if (!projectId) return;

  const counter = activeCounters.get(projectId);
  if (!counter) return;

  event.waitUntil(showCounterNotification(projectId, counter.projectTitle, counter.currentRow));
});

export {};
