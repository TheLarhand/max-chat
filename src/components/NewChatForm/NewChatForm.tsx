import { useState, type FormEvent } from 'react';
import styles from './NewChatForm.module.scss';

type Props = {
  loading: boolean;
  error: string | null;
  onOpen: (phone: string) => void;
};

export function NewChatForm({ loading, error, onOpen }: Props) {
  const [phone, setPhone] = useState('');
  const canSubmit = phone.trim() !== '' && !loading;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (canSubmit) onOpen(phone);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>Новый чат</h2>
      <label className={styles.field}>
        <span>Телефон получателя</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+7 999 123-45-67"
          autoComplete="off"
          disabled={loading}
        />
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={!canSubmit}>
        {loading ? 'Открываем…' : 'Открыть чат'}
      </button>
    </form>
  );
}
