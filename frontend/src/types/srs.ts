export type UserRole = 'learner' | 'helper' | 'admin' | 'codesigner';
export type AccessibilityMode = 'voice_first' | 'screen_reader' | 'hybrid';
export type ContrastTheme = 'standard' | 'high_contrast' | 'pure_black' | 'yellow_black';
export type FontSize = 'normal' | 'large' | 'xlarge';
export type Language = 'en' | 'am' | 'om';

export interface AccessibilitySettings {
  mode: AccessibilityMode;
  theme: ContrastTheme;
  fontSize: FontSize;
  speechRate: number;
  speechPitch: number;
  audioCuesEnabled: boolean;
  screenReaderFriendly: boolean;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  language: Language;
  role: UserRole;
  accessibility_settings: AccessibilitySettings;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  audio_url?: string;
  transcript: string;
  order_index: number;
  has_human_image_descriptions: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  module_id: string;
  title: string;
  questions: QuizQuestion[];
  status: 'draft' | 'published';
}

export type HelpRequestType = 'payment' | 'general' | 'technical' | 'telegram' | 'urgent';
export type HelpRequestTrigger = 'learner' | 'assistant';
export type HelpRequestStatus = 'waiting' | 'assigned' | 'in_progress' | 'done';

export interface HelpRequest {
  id: string;
  learner_id: string;
  learner_name?: string;
  learner_phone?: string;
  course_id?: string;
  course_title?: string;
  type: HelpRequestType;
  trigger: HelpRequestTrigger;
  summary: string;
  status: HelpRequestStatus;
  assigned_helper_id?: string;
  assigned_helper_name?: string;
  channel: 'web' | 'telegram' | 'phone' | 'sms';
  contact_preference: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TelegramLink {
  id: string;
  learner_id: string;
  telegram_id?: number;
  link_code: string;
  code_expires_at: string;
  language: Language;
  consent: boolean;
  linked_at?: string;
}

export interface Job {
  id: string;
  title: string;
  employer: string;
  location: string;
  requirements: string;
  how_to_apply: string;
  deadline?: string;
  accessibility_notes?: string;
  status: 'draft' | 'published' | 'closed';
}

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

