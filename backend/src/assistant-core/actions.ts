import { z } from 'zod';
import { AllowedAction, AllowedActionName } from './types.js';

export const FillFieldSchema = z.object({
  field: z.enum(['name', 'email', 'phone', 'preferred_language']),
  value: z.string().min(1),
});

export const ReadBackSchema = z.object({
  field: z.string(),
  value: z.string(),
});

export const GoToPageSchema = z.object({
  path: z.enum(['/register', '/courses', '/payment', '/learn', '/profile', '/staff/help-queue']),
});

export const SelectCourseSchema = z.object({
  course_id: z.string().min(1),
  course_title: z.string().optional(),
});

export const RequestHumanSchema = z.object({
  reason: z.string(),
  type: z.enum(['payment', 'general', 'technical', 'telegram', 'urgent']).default('general'),
});

export const StartQuizSchema = z.object({
  quiz_id: z.string().min(1),
});

export function validateAction(name: string, params: Record<string, any>): AllowedAction | null {
  try {
    switch (name as AllowedActionName) {
      case 'fill_field': {
        const validated = FillFieldSchema.parse(params);
        return { name: 'fill_field', params: validated };
      }
      case 'read_back': {
        const validated = ReadBackSchema.parse(params);
        return { name: 'read_back', params: validated };
      }
      case 'go_to_page': {
        const validated = GoToPageSchema.parse(params);
        return { name: 'go_to_page', params: validated };
      }
      case 'select_course': {
        const validated = SelectCourseSchema.parse(params);
        return { name: 'select_course', params: validated };
      }
      case 'request_human': {
        const validated = RequestHumanSchema.parse(params);
        return { name: 'request_human', params: validated, requiresConfirmation: false };
      }
      case 'start_quiz': {
        const validated = StartQuizSchema.parse(params);
        return { name: 'start_quiz', params: validated };
      }
      default:
        console.warn(`[Assistant Core] Rejected unallowed action: ${name}`);
        return null;
    }
  } catch (error) {
    console.error(`[Assistant Core] Action validation failed for ${name}:`, error);
    return null;
  }
}

