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

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const message = event.data as LockscreenMessage;

  if (!message) return;

  if (message.type === 'CLEAR_LOCKSCREEN_COUNTER') {
    const { projectId } = message.payload;

    event.waitUntil(
      self.registration
        .getNotifications({ tag: `hooked-project-${projectId}` })
        .then((notifications) => notifications.forEach((notification) => notification.close())),
    );
    return;
  }

  if (message.type !== 'SHOW_LOCKSCREEN_COUNTER') return;

  const { projectId, projectTitle, currentRow } = message.payload;

  event.waitUntil(
    self.registration.showNotification(`Rang ${currentRow}`, {
      body: projectTitle,
      tag: `hooked-project-${projectId}`,
      requireInteraction: true,
      renotify: true,
      timestamp: Date.now(),
      data: { projectId },
      actions: [
        { action: 'increment-row', title: '+' },
        { action: 'decrement-row', title: '-' },
      ],
      icon: '/pwa-192x192.png',
      badge: '/logo-mini.svg',
    } as NotificationOptions),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  const projectId = event.notification.data?.projectId as string | undefined;
  event.notification.close();

  if (!projectId) {
    return;
  }

  if (event.action !== 'increment-row' && event.action !== 'decrement-row') {
    event.waitUntil(self.clients.openWindow(`/#/projects/${projectId}`));
    return;
  }

  const eventType = event.action === 'increment-row'
    ? 'LOCKSCREEN_INCREMENT_ROW'
    : 'LOCKSCREEN_DECREMENT_ROW';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      if (clientList.length > 0) {
        const targetClient = clientList[0] as WindowClient;
        await targetClient.focus();
        targetClient.postMessage({
          type: eventType,
          projectId,
        });
        return;
      }

      await self.clients.openWindow(`/#/projects/${projectId}`);
    })(),
  );
});

export {};
