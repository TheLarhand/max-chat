import type { Credentials } from '../types/credentials';
import type {
  RawCheckAccount,
  RawHistoryMessage,
  RawNotification,
  RawSendMessageResponse,
  RawSettings,
  RawStateInstance,
} from '../types/greenApi';

/**
 * Единственное место, которое знает URL GREEN-API и формат запросов.
 * apiTokenInstance попадает только в URL запроса и нигде не логируется
 * и не включается в тексты ошибок.
 */

export class GreenApiError extends Error {
  readonly kind: 'network' | 'auth' | 'quota' | 'http';
  readonly status?: number;

  constructor(kind: GreenApiError['kind'], message: string, status?: number) {
    super(message);
    this.name = 'GreenApiError';
    this.kind = kind;
    this.status = status;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof GreenApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Неизвестная ошибка';
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function resolveApiUrl({ idInstance, apiUrl }: Credentials): string {
  const custom = apiUrl?.trim();
  if (custom) return custom.replace(/\/+$/, '');
  // Для кластерных инстансов хост строится по первым 4 цифрам idInstance.
  return `https://${idInstance.slice(0, 4)}.api.green-api.com`;
}

type RequestOptions = {
  method: string;
  httpMethod?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number>;
  /** Дополнительный сегмент пути после токена (нужен для deleteNotification). */
  pathSuffix?: string;
  signal?: AbortSignal;
};

async function request<T>(
  credentials: Credentials,
  { method, httpMethod = 'GET', body, query, pathSuffix, signal }: RequestOptions,
): Promise<T> {
  const base = resolveApiUrl(credentials);
  const { idInstance, apiTokenInstance } = credentials;

  let url = `${base}/waInstance${encodeURIComponent(idInstance)}/${method}/${encodeURIComponent(apiTokenInstance)}`;
  if (pathSuffix) url += `/${encodeURIComponent(pathSuffix)}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => params.set(key, String(value)));
    url += `?${params.toString()}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: httpMethod,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    // Сообщение исходной ошибки не используем: в нём может быть URL с токеном.
    throw new GreenApiError(
      'network',
      'Не удалось связаться с GREEN-API. Проверьте интернет и адрес API.',
    );
  }

  if (!response.ok) {
    throw await toHttpError(response, method);
  }

  const text = await response.text();
  if (!text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GreenApiError('http', `GREEN-API вернул некорректный ответ (${method}).`);
  }
}

async function toHttpError(response: Response, method: string): Promise<GreenApiError> {
  const { status } = response;

  if (status === 401 || status === 403) {
    return new GreenApiError(
      'auth',
      'Неверные idInstance или apiTokenInstance, либо доступ к инстансу ограничен.',
      status,
    );
  }
  if (status === 466 || status === 429) {
    return new GreenApiError(
      'quota',
      'Превышен лимит запросов или квота тарифа. Подождите и попробуйте снова.',
      status,
    );
  }
  if (status === 469) {
    return new GreenApiError(
      'quota',
      'MAX ограничил проверку номеров. Подождите несколько минут и попробуйте снова.',
      status,
    );
  }

  let details = '';
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      const raw = record.message ?? record.reason ?? record.error;
      if (typeof raw === 'string') details = raw.slice(0, 200);
    }
  } catch {
    // тело не JSON, оставляем только код статуса
  }

  return new GreenApiError(
    'http',
    `Ошибка GREEN-API в методе ${method} (HTTP ${status})${details ? `: ${details}` : ''}`,
    status,
  );
}

export function getStateInstance(credentials: Credentials, signal?: AbortSignal) {
  return request<RawStateInstance>(credentials, { method: 'getStateInstance', signal });
}

export function getSettings(credentials: Credentials, signal?: AbortSignal) {
  return request<RawSettings>(credentials, { method: 'getSettings', signal });
}

export function checkAccount(credentials: Credentials, phoneNumber: number, signal?: AbortSignal) {
  return request<RawCheckAccount>(credentials, {
    method: 'checkAccount',
    httpMethod: 'POST',
    body: { phoneNumber },
    signal,
  });
}

export function getChatHistory(
  credentials: Credentials,
  chatId: string,
  count = 50,
  signal?: AbortSignal,
) {
  return request<RawHistoryMessage[]>(credentials, {
    method: 'getChatHistory',
    httpMethod: 'POST',
    body: { chatId, count },
    signal,
  });
}

export function sendMessage(
  credentials: Credentials,
  chatId: string,
  message: string,
  signal?: AbortSignal,
) {
  return request<RawSendMessageResponse>(credentials, {
    method: 'sendMessage',
    httpMethod: 'POST',
    body: { chatId, message },
    signal,
  });
}

/** Возвращает null, если за receiveTimeout секунд новых уведомлений не было. */
export function receiveNotification(
  credentials: Credentials,
  receiveTimeout: number,
  signal?: AbortSignal,
) {
  return request<RawNotification | null>(credentials, {
    method: 'receiveNotification',
    query: { receiveTimeout },
    signal,
  });
}

export function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal?: AbortSignal,
) {
  return request<unknown>(credentials, {
    method: 'deleteNotification',
    httpMethod: 'DELETE',
    pathSuffix: String(receiptId),
    signal,
  });
}
