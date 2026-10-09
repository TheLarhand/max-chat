import { useState, type FormEvent } from 'react';
import type { Credentials } from '../../types/credentials';
import styles from './CredentialsForm.module.scss';

type Props = {
  loading: boolean;
  error: string | null;
  onConnect: (credentials: Credentials) => void;
};

export function CredentialsForm({ loading, error, onConnect }: Props) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [apiUrl, setApiUrl] = useState('');

  const canSubmit = idInstance.trim() !== '' && apiTokenInstance.trim() !== '' && !loading;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    onConnect({
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: apiUrl.trim() || undefined,
    });
  }

  return (
    <main className={styles.screen}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.logo} aria-hidden="true">
          <svg viewBox="0 0 32 32" width="28" height="28">
            <path
              d="M9 22V10l7 8 7-8v12"
              fill="none"
              stroke="#fff"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className={styles.title}>Подключение к GREEN-API</h1>
        <p className={styles.hint}>
          Данные инстанса MAX берутся из личного кабинета GREEN-API. Токен хранится только в памяти
          страницы и пропадает после перезагрузки.
        </p>

        <label className={styles.field}>
          <span>ID Instance</span>
          <input
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="3100000000"
            disabled={loading}
          />
        </label>

        <label className={styles.field}>
          <span>API Token Instance</span>
          <input
            type="password"
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            autoComplete="off"
            disabled={loading}
          />
        </label>

        <details className={styles.advanced}>
          <summary>Свой адрес API</summary>
          <label className={styles.field}>
            <span>API URL</span>
            <input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              autoComplete="off"
              placeholder="https://3100.api.green-api.com"
              disabled={loading}
            />
          </label>
          <p className={styles.note}>
            Если пусто, адрес собирается из первых четырёх цифр ID Instance.
          </p>
        </details>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={!canSubmit}>
          {loading ? 'Проверяем…' : 'Подключиться'}
        </button>
      </form>
    </main>
  );
}
