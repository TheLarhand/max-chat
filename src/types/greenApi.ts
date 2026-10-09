// Сырые структуры ответов GREEN-API.
// Их знают только service-слой и mapper, компоненты работают с Message / Chat.

export type RawStateInstance = {
  stateInstance: string;
};

export type RawSettings = {
  incomingWebhook?: string;
  outgoingMessageWebhook?: string;
  outgoingAPIMessageWebhook?: string;
};

export type RawCheckAccount = {
  exist?: boolean;
  chatId?: string;
  /** false, если инстанс не готов или превышен лимит проверок. */
  status?: boolean;
  reason?: string;
};

export type RawSendMessageResponse = {
  idMessage: string;
};

export type RawHistoryMessage = {
  type?: string;
  idMessage?: string;
  timestamp?: number;
  typeMessage?: string;
  chatId?: string;
  statusMessage?: string;
  isDeleted?: boolean;
  textMessage?: string;
  text?: string;
  extendedTextMessage?: { text?: string };
};

export type RawNotificationBody = {
  typeWebhook?: string;
  timestamp?: number;
  idMessage?: string;
  senderData?: {
    chatId?: string;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
  };
};

export type RawNotification = {
  receiptId: number;
  body: RawNotificationBody;
};
