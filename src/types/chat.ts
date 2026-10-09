export type Chat = {
  /** chatId в GREEN-API (для MAX это числовой id пользователя). */
  id: string;
  name?: string;
  /** Номер телефона в виде одних цифр, например 79991234567. */
  phone: string;
};
