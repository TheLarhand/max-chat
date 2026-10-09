import { useEffect, useRef } from 'react';
import type { Message } from '../../types/message';
import styles from './MessageList.module.scss';

type Props = {
  messages: Message[];
  loading: boolean;
};

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessageList({ messages, loading }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  // Автопрокрутка к последнему сообщению при изменении списка.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, loading]);

  if (loading && messages.length === 0) {
    return <div className={styles.placeholder}>Загружаем историю…</div>;
  }

  if (messages.length === 0) {
    return <div className={styles.placeholder}>Сообщений пока нет. Напишите первое.</div>;
  }

  return (
    <div className={styles.list}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`${styles.row} ${message.type === 'outgoing' ? styles.out : styles.in}`}
        >
          <div className={styles.bubble}>
            <span className={styles.text}>{message.text}</span>
            <time className={styles.time}>{formatTime(message.timestamp)}</time>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
