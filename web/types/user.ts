import { AccessibilityPreferences } from "./a11y";

export type UserRole = "learner" | "employer" | "mentor" | "administrator" | "co-designer";

export interface UserSkill {
  id: string;
  name: string;
  category: string;
  proficiencyLevel: "beginner" | "intermediate" | "advanced";
  verifiedDate?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
  preferences: AccessibilityPreferences;
  skills: UserSkill[];
  currentCourseId?: string;
  currentLessonId?: string;
}
