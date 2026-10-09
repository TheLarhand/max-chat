import type { Message } from '../types/message';

/**
 * Добавляет сообщения в список без дублей (ключ — id сообщения, idMessage в GREEN-API)
 * и держит список отсортированным по времени.
 * Если сообщение уже есть, оставляется существующее.
 */
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map<string, Message>();
  current.forEach((message) => byId.set(message.id, message));

  let changed = false;
  incoming.forEach((message) => {
    if (!byId.has(message.id)) {
      byId.set(message.id, message);
      changed = true;
    }
  });

  if (!changed) return current;
  return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
}
