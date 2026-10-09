import { useEffect, useRef, useState } from 'react';
import {
  deleteNotification,
  getErrorMessage,
  isAbortError,
  receiveNotification,
  GreenApiError,
} from '../services/greenApi';
import type { Credentials } from '../types/credentials';
import type { Message } from '../types/message';
import { mapNotificationToMessage } from '../utils/messageMapper';

const RECEIVE_TIMEOUT_SECONDS = 10;
const MIN_CYCLE_MS = 500;
const RETRY_DELAYS_MS = [1000, 3000, 5000, 10000];

type Options = {
  credentials: Credentials | null;
  onMessage: (message: Message) => void;
};

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Один polling-цикл на подключение:
 * receiveNotification -> mapper -> onMessage -> deleteNotification.
 *
 * Эффект зависит только от credentials, поэтому новые сообщения
 * не перезапускают цикл. onMessage хранится в ref и всегда актуален.
 * При unmount или смене credentials цикл останавливается через AbortController.
 */
export function useNotifications({ credentials, onMessage }: Options): { error: string | null } {
  const [error, setError] = useState<string | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    if (!credentials) return;

    const controller = new AbortController();
    const { signal } = controller;

    async function poll(activeCredentials: Credentials) {
      let failures = 0;

      while (!signal.aborted) {
        const startedAt = Date.now();
        try {
          const notification = await receiveNotification(
            activeCredentials,
            RECEIVE_TIMEOUT_SECONDS,
            signal,
          );
          failures = 0;
          setError(null);

          if (notification) {
            const message = mapNotificationToMessage(notification);
            if (message) onMessageRef.current(message);
            // Удаляем всегда, в том числе неподдерживаемые типы, чтобы очередь не зацикливалась.
            await deleteNotification(activeCredentials, notification.receiptId, signal);
          }

          // Защита от «горячего» цикла, если сервер отвечает мгновенно.
          const elapsed = Date.now() - startedAt;
          if (!notification && elapsed < MIN_CYCLE_MS) await sleep(MIN_CYCLE_MS - elapsed, signal);

        } catch (err) {
          if (signal.aborted || isAbortError(err)) return;

          // HTTP 408 при ожидании уведомления — штатный тайм-аут.
          if (err instanceof GreenApiError && err.status === 408) {
            continue;
          }

          console.error('Ошибка получения уведомлений:', getErrorMessage(err));
          setError(`Не удаётся получить новые сообщения: ${getErrorMessage(err)}`);

          const delay = RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)];
          failures += 1;
          await sleep(delay, signal);
        }

      }
    }

    void poll(credentials);

    return () => {
      controller.abort();
      setError(null);
    };
  }, [credentials]);

  return { error };
}
