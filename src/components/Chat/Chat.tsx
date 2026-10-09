import type { Chat as ChatModel } from '../../types/chat';
import type { Message } from '../../types/message';
import { formatPhone } from '../../utils/chatId';
import { MessageInput } from '../MessageInput/MessageInput';
import { MessageList } from '../MessageList/MessageList';
import styles from './Chat.module.scss';

type Props = {
  chat: ChatModel;
  messages: Message[];
  loadingHistory: boolean;
  sending: boolean;
  error: string | null;
  pollError: string | null;
  onSend: (text: string) => Promise<boolean>;
  onBack: () => void;
};

export function Chat({
  chat,
  messages,
  loadingHistory,
  sending,
  error,
  pollError,
  onSend,
  onBack,
}: Props) {
  return (
    <section className={styles.chat}>
      <header className={styles.header}>
        <button className={styles.back} type="button" onClick={onBack} aria-label="Назад">
          ‹
        </button>
        <div className={styles.avatar} aria-hidden="true">
          {chat.phone.slice(-2)}
        </div>
        <div>
          <div className={styles.name}>{chat.name ?? formatPhone(chat.phone)}</div>
          <div className={styles.sub}>MAX</div>
        </div>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {pollError && (
        <p className={styles.warn} role="status">
          {pollError}
        </p>
      )}

      <MessageList messages={messages} loading={loadingHistory} />
      <MessageInput disabled={sending || loadingHistory} onSend={onSend} />
    </section>
  );
}
