export type Credentials = {
  idInstance: string;
  apiTokenInstance: string;
  /** Необязательно. Если не задан, берётся из первых 4 цифр idInstance. */
  apiUrl?: string;
};
