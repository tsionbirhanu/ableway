export interface LessonExercise {
  id: string;
  type: "quiz" | "keyboard-practice" | "spoken-reflection";
  question: string;
  options?: string[];
  correctAnswer?: string | number;
  explanation: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  description: string;
  audioUrl?: string;
  transcript: string;
  durationMinutes: number;
  order: number;
  exercises: LessonExercise[];
  isCompleted?: boolean;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  code: string; // e.g., "WR 100", "VA-1"
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  modules: Module[];
  totalLessons: number;
  estimatedHours: number;
  skillsTaught: string[];
}
