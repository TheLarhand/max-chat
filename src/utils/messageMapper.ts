import type { Message } from '../types/message';
import type { RawHistoryMessage, RawNotification } from '../types/greenApi';

const TEXT_TYPES = new Set(['textMessage', 'extendedTextMessage', 'quotedMessage']);

const WEBHOOK_TO_DIRECTION: Record<string, Message['type']> = {
  incomingMessageReceived: 'incoming',
  outgoingMessageReceived: 'outgoing',
  outgoingAPIMessageReceived: 'outgoing',
};

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Элемент ответа getChatHistory -> Message. null, если это не текстовое сообщение. */
export function mapHistoryMessage(raw: RawHistoryMessage): Message | null {
  if (!raw.idMessage || !raw.chatId) return null;
  if (raw.type !== 'incoming' && raw.type !== 'outgoing') return null;
  if (raw.isDeleted) return null;
  if (raw.typeMessage && !TEXT_TYPES.has(raw.typeMessage)) return null;

  const text = raw.textMessage ?? raw.extendedTextMessage?.text ?? raw.text;
  if (!text) return null;

  return {
    id: raw.idMessage,
    chatId: raw.chatId,
    type: raw.type,
    text,
    timestamp: raw.timestamp ?? nowInSeconds(),
    status: raw.statusMessage,
  };
}

/** Уведомление receiveNotification -> Message. null, если это не поддерживаемое текстовое сообщение. */
export function mapNotificationToMessage(notification: RawNotification): Message | null {
  const { body } = notification;
  if (!body?.typeWebhook) return null;

  const type = WEBHOOK_TO_DIRECTION[body.typeWebhook];
  if (!type) return null;

  const chatId = body.senderData?.chatId;
  const messageData = body.messageData;
  if (!body.idMessage || !chatId || !messageData?.typeMessage) return null;
  if (!TEXT_TYPES.has(messageData.typeMessage)) return null;

  const text =
    messageData.typeMessage === 'textMessage'
      ? messageData.textMessageData?.textMessage
      : messageData.extendedTextMessageData?.text;
  if (!text) return null;

  return {
    id: body.idMessage,
    chatId,
    type,
    text,
    timestamp: body.timestamp ?? nowInSeconds(),
  };
}
