import { checkAccount } from '../services/greenApi';
import type { Chat } from '../types/chat';
import type { Credentials } from '../types/credentials';

/**
 * Приводит введённый номер к виду из одних цифр (79991234567).
 * Возвращает null, если номер не похож на корректный (MAX принимает 11–12 цифр: РФ и РБ).
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith('9')) digits = `7${digits}`;

  return digits.length === 11 || digits.length === 12 ? digits : null;
}

export function formatPhone(digits: string): string {
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  return `+${digits}`;
}

/**
 * Единственное место, где номер телефона превращается в chatId.
 * В MAX chatId — числовой id пользователя, а не «номер@c.us»,
 * поэтому его нужно получать через CheckAccount.
 */
export async function resolveChat(credentials: Credentials, rawPhone: string): Promise<Chat> {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    throw new Error('Введите номер в международном формате, например +7 999 123-45-67.');
  }

  const result = await checkAccount(credentials, Number(phone));
  if (result.status === false) {
    throw new Error(
      result.reason === 'instance is starting or not authorized'
        ? 'Инстанс запускается или не авторизован. Подождите и попробуйте снова.'
        : 'Не удалось проверить номер. Попробуйте позже.',
    );
  }
  if (!result.exist || !result.chatId) {
    throw new Error('На этом номере нет аккаунта MAX.');
  }

  return { id: result.chatId, phone };
}
