export interface TutorMessage {
  id: string;
  sender: "user" | "tutor" | "system";
  content: string;
  audioUrl?: string;
  timestamp: number;
  isHelpful?: boolean | null;
  flaggedForReview?: boolean;
}

export interface TutorConversation {
  id: string;
  userId: string;
  lessonContextId?: string;
  messages: TutorMessage[];
  startedAt: string;
}
