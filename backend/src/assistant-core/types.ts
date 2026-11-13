export type Channel = 'web' | 'telegram';
export type SupportedLanguage = 'en' | 'am' | 'om';

export type AllowedActionName =
  | 'fill_field'
  | 'read_back'
  | 'go_to_page'
  | 'select_course'
  | 'request_human'
  | 'start_quiz';

export interface AllowedAction {
  name: AllowedActionName;
  params: Record<string, any>;
  requiresConfirmation?: boolean;
}

export interface AssistantRequest {
  message: string;
  userId?: string;
  channel: Channel;
  language: SupportedLanguage;
  currentPage?: string;
  context?: Record<string, any>;
  misunderstandingCount?: number;
}

export interface AssistantResponse {
  reply: string;
  spokenReply?: string;
  actions: AllowedAction[];
  escalateToHuman: boolean;
  escalationReason?: string;
  escalationType?: 'payment' | 'general' | 'technical' | 'telegram' | 'urgent';
  language: SupportedLanguage;
  sources?: string[];
}

