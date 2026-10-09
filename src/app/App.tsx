import { useCallback, useMemo, useRef, useState } from 'react';
import { Chat } from '../components/Chat/Chat';
import { CredentialsForm } from '../components/CredentialsForm/CredentialsForm';
import { NewChatForm } from '../components/NewChatForm/NewChatForm';
import { useNotifications } from '../hooks/useNotifications';
import {
  getChatHistory,
  getErrorMessage,
  getSettings,
  getStateInstance,
  sendMessage,
} from '../services/greenApi';
import type { Chat as ChatModel } from '../types/chat';
import type { Credentials } from '../types/credentials';
import type { Message } from '../types/message';
import { resolveChat } from '../utils/chatId';
import { mergeMessages } from '../utils/mergeMessages';
import { mapHistoryMessage } from '../utils/messageMapper';
import styles from './App.module.scss';

const HISTORY_COUNT = 50;

const STATE_HINTS: Record<string, string> = {
  notAuthorized: 'Аккаунт MAX не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API.',
  starting: 'Инстанс запускается. Подождите минуту и попробуйте снова.',
  yellowCard: 'Инстанс временно ограничен (yellowCard).',
  blocked: 'Аккаунт заблокирован.',
  sleepMode: 'Инстанс в спящем режиме. Откройте его в личном кабинете.',
};

export function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [settingsWarning, setSettingsWarning] = useState<string | null>(null);

  const [chat, setChat] = useState<ChatModel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Защита от гонки: ответ истории старого чата не должен попасть в новый.
  const openRequestRef = useRef(0);

  const handleIncoming = useCallback((message: Message) => {
    setMessages((prev) => mergeMessages(prev, [message]));
  }, []);

  const { error: pollError } = useNotifications({ credentials, onMessage: handleIncoming });

  const visibleMessages = useMemo(
    () => (chat ? messages.filter((m) => m.chatId === chat.id) : []),
    [messages, chat],
  );

  async function handleConnect(next: Credentials) {
    setConnecting(true);
    setConnectError(null);
    try {
      const { stateInstance } = await getStateInstance(next);
      if (stateInstance !== 'authorized') {
        setConnectError(
          STATE_HINTS[stateInstance] ?? `Инстанс не авторизован (состояние: ${stateInstance}).`,
        );
        return;
      }

      // Необязательная проверка: без включённых уведомлений ответы не придут.
      try {
        const settings = await getSettings(next);
        const missing =
          settings.incomingWebhook === 'no' ||
          settings.outgoingMessageWebhook === 'no' ||
          settings.outgoingAPIMessageWebhook === 'no';
        setSettingsWarning(
          missing
            ? 'В настройках инстанса выключены уведомления о сообщениях. Включите их в личном кабинете GREEN-API, иначе ответы не появятся.'
            : null,
        );
      } catch {
        setSettingsWarning(null);
      }

      setCredentials(next);
    } catch (err) {
      console.error('Ошибка подключения:', getErrorMessage(err));
      setConnectError(getErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    openRequestRef.current += 1;
    setCredentials(null);
    setChat(null);
    setMessages([]);
    setSettingsWarning(null);
    setOpenError(null);
    setChatError(null);
    setConnectError(null);
  }

  async function handleOpenChat(phone: string) {
    if (!credentials) return;
    const requestId = ++openRequestRef.current;

    setOpening(true);
    setOpenError(null);
    setLoadingHistory(false);
    try {
      const nextChat = await resolveChat(credentials, phone);
      if (requestId !== openRequestRef.current) return;

      setChat(nextChat);
      setChatError(null);
      setOpening(false);
      setLoadingHistory(true);

      try {
        const history = await getChatHistory(credentials, nextChat.id, HISTORY_COUNT);
        if (!Array.isArray(history)) throw new Error('неожиданный формат ответа');
        const mapped = history.map(mapHistoryMessage).filter((m): m is Message => m !== null);
        // Сообщения привязаны к chatId, поэтому сливаем их даже если пользователь уже открыл другой чат.
        setMessages((prev) => mergeMessages(prev, mapped));
      } catch (err) {
        if (requestId !== openRequestRef.current) return;
        console.error('Ошибка загрузки истории:', getErrorMessage(err));
        setChatError(`Не удалось загрузить историю: ${getErrorMessage(err)}`);
      } finally {
        if (requestId === openRequestRef.current) setLoadingHistory(false);
      }
    } catch (err) {
      if (requestId !== openRequestRef.current) return;
      setOpenError(getErrorMessage(err));
    } finally {
      if (requestId === openRequestRef.current) setOpening(false);
    }
  }

  async function handleSend(text: string): Promise<boolean> {
    if (!credentials || !chat) return false;
    setSending(true);
    setChatError(null);
    try {
      const { idMessage } = await sendMessage(credentials, chat.id, text);
      handleIncoming({
        id: idMessage,
        chatId: chat.id,
        type: 'outgoing',
        text,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'sent',
      });
      return true;
    } catch (err) {
      console.error('Ошибка отправки:', getErrorMessage(err));
      setChatError(`Сообщение не отправлено: ${getErrorMessage(err)}`);
      return false;
    } finally {
      setSending(false);
    }
  }

  if (!credentials) {
    return <CredentialsForm loading={connecting} error={connectError} onConnect={handleConnect} />;
  }

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <svg viewBox="0 0 32 32" width="20" height="20">
              <path
                d="M9 22V10l7 8 7-8v12"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          MAX
        </div>
        <div className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          Connected · {credentials.idInstance}
        </div>
        <button className={styles.disconnect} type="button" onClick={handleDisconnect}>
          Отключиться
        </button>
      </header>

      {settingsWarning && (
        <p className={styles.warning} role="status">
          {settingsWarning}
        </p>
      )}

      <div className={`${styles.body} ${chat ? styles.hasChat : ''}`}>
        <aside className={styles.sidebar}>
          <NewChatForm loading={opening} error={openError} onOpen={handleOpenChat} />
        </aside>

        <main className={styles.main}>
          {chat ? (
            <Chat
              chat={chat}
              messages={visibleMessages}
              loadingHistory={loadingHistory}
              sending={sending}
              error={chatError}
              pollError={pollError}
              onSend={handleSend}
              onBack={() => setChat(null)}
            />
          ) : (
            <div className={styles.empty}>Введите номер телефона и откройте чат</div>
          )}
        </main>
      </div>
    </div>
  );
}
