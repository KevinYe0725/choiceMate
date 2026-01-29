import type { FactsCompletionItem } from '../api/types';

export type Message = {
  id: string;
  role: 'system' | 'user';
  content: any;
  ts: number;
};

export type Conversation = {
  conversationId: string;
  createdAt: number;
  updatedAt: number;
  problem: string;
  options: string[];
  // state/decision are stored in snake_case as returned by backend for consistency.
  state: any | null;
  round: number;
  decision: any | null;
  factsCompletion: FactsCompletionItem[];
  assumptions: string[];
  messages: Message[];
};

const STORAGE_KEY = 'choicemate_conversations_v1';

export const loadConversations = (): Conversation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Conversation[];
  } catch {
    return [];
  }
};

export const saveConversations = (conversations: Conversation[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
};

export const upsertConversation = (conversation: Conversation) => {
  const list = loadConversations();
  const idx = list.findIndex((item) => item.conversationId === conversation.conversationId);
  if (idx >= 0) {
    list[idx] = conversation;
  } else {
    list.push(conversation);
  }
  saveConversations(list);
};

export const getConversationById = (conversationId: string): Conversation | null => {
  const list = loadConversations();
  return list.find((item) => item.conversationId === conversationId) ?? null;
};

export const updateConversationList = (
  updater: (conversations: Conversation[]) => Conversation[]
) => {
  const list = loadConversations();
  const next = updater(list);
  saveConversations(next);
};
