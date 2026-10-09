import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import styles from './MessageInput.module.scss';

type Props = {
  disabled: boolean;
  /** Возвращает true, если сообщение отправлено и поле можно очистить. */
  onSend: (text: string) => Promise<boolean>;
};

export function MessageInput({ disabled, onSend }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canSend = text.trim() !== '' && !disabled;

  async function submit() {
    if (!canSend) return;
    const ok = await onSend(text.trim());
    if (ok) {
      setText('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <textarea
        ref={inputRef}
        className={styles.input}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onKeyDown={handleKeyDown}
        placeholder="Сообщение"
        rows={1}
        maxLength={4000}
        aria-label="Текст сообщения"
      />
      <button className={styles.send} type="submit" disabled={!canSend} aria-label="Отправить">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" fill="currentColor" />
        </svg>
      </button>
    </form>
  );
}
