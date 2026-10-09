export type Message = {
  id: string;
  chatId: string;
  type: 'incoming' | 'outgoing';
  text: string;
  timestamp: number;
  status?: string;
};
