/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

interface ShowLockscreenIncrementMessage {
  type: 'SHOW_LOCKSCREEN_INCREMENT';
  payload: {
    projectId: string;
    projectTitle: string;
    currentRow: number;
  };
}

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const message = event.data as ShowLockscreenIncrementMessage;

  if (!message || message.type !== 'SHOW_LOCKSCREEN_INCREMENT') return;

  const { projectId, projectTitle, currentRow } = message.payload;

  event.waitUntil(
    self.registration.showNotification(`Hooked - ${projectTitle}`, {
      body: `Rang actuel: ${currentRow}`,
      tag: `hooked-project-${projectId}`,
      requireInteraction: true,
      data: { projectId },
      actions: [
        { action: 'increment-row', title: '+1 rang' },
      ],
      icon: '/pwa-192x192.png',
      badge: '/logo-mini.svg',
    } as NotificationOptions),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  const projectId = event.notification.data?.projectId as string | undefined;
  event.notification.close();

  if (event.action !== 'increment-row' || !projectId) {
    return;
  }

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
          type: 'LOCKSCREEN_INCREMENT_ROW',
          projectId,
        });
        return;
      }

      await self.clients.openWindow(`/#/projects/${projectId}`);
    })(),
  );
});

export {};
