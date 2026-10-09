# MAX Chat на GREEN-API

Минималистичный веб-чат для отправки и получения текстовых сообщений в MAX через [GREEN-API](https://green-api.com/max).
React + TypeScript + Vite, SCSS Modules. Backend нет: браузер напрямую работает с GREEN-API.

## Запуск локально

Нужен Node.js 18 или новее.

```bash
npm install
npm run dev      # http://localhost:5173
```

Сборка и предпросмотр:

```bash
npm run build
npm run preview
```

## Как пользоваться

1. Откройте приложение и введите `ID Instance` и `API Token Instance` из [личного кабинета GREEN-API](https://console.green-api.com). Инстанс должен быть в состоянии `authorized`.
2. В кабинете включите уведомления: о входящих сообщениях, о сообщениях с телефона и о сообщениях, отправленных через API. Изменения применяются до 5 минут.
3. Введите номер получателя (например `+7 999 123-45-67`) и нажмите «Открыть чат».
4. Пишите сообщения. Ответы собеседника появляются автоматически.

Токен хранится только в памяти страницы. В localStorage, `.env`, код и логи приложения он не попадает. Токен входит в URL запросов GREEN-API (так устроен их API), поэтому он виден во вкладке Network инструментов разработчика самого пользователя.

## Как это устроено

```
src/
├── app/            App: состояние (credentials, чат, сообщения, ошибки)
├── components/     CredentialsForm, NewChatForm, Chat, MessageList, MessageInput
├── hooks/          useNotifications: polling уведомлений
├── services/       greenApi.ts: все запросы к GREEN-API
├── types/          Message, Chat, Credentials и сырые типы GREEN-API
└── utils/          chatId (номер -> chatId), messageMapper, mergeMessages
```

- **chatId в MAX** это числовой id пользователя, а не `номер@c.us`. Он получается методом `checkAccount` по номеру телефона (`utils/chatId.ts`).
- **История**: `getChatHistory` с `count: 50`, результат проходит через `mapHistoryMessage`.
- **Отправка**: `sendMessage`, сообщение сразу добавляется в чат.
- **Получение**: `useNotifications` запускает один цикл `receiveNotification?receiveTimeout=10` на подключение. Каждое уведомление проходит `mapNotificationToMessage`, попадает в state и удаляется через `deleteNotification`. Неподдерживаемые уведомления тоже удаляются, чтобы очередь не зацикливалась. При ошибке сети цикл повторяет запрос с нарастающей паузой. При отключении цикл останавливается через `AbortController`.
- **Дубли**: сообщения хранятся по `idMessage`. Если исходящее сообщение пришло и из `sendMessage`, и из notification, оно показывается один раз.
- **Адрес API** строится из первых 4 цифр `idInstance` (`https://3100.api.green-api.com`). При необходимости его можно переопределить в форме подключения.

