import { VoiceCommandDefinition, VoiceCommandIntent } from "@/types/voice";

export const GLOBAL_VOICE_COMMANDS: VoiceCommandDefinition[] = [
  {
    intent: "HELP",
    phrases: ["help", "what can i do", "commands", "show commands", "options"],
    description: "Lists commands available on the current page",
  },
  {
    intent: "WHERE_AM_I",
    phrases: ["where am i", "current location", "current page", "status"],
    description: "States the current page and section",
  },
  {
    intent: "GO_HOME",
    phrases: ["go home", "home", "dashboard", "main page"],
    description: "Navigates to the main learner dashboard",
  },
  {
    intent: "GO_BACK",
    phrases: ["go back", "back", "previous page", "return"],
    description: "Navigates to the previous page",
  },
  {
    intent: "REPEAT",
    phrases: ["repeat", "say again", "repeat that", "what was that"],
    description: "Repeats the last spoken content",
  },
  {
    intent: "SLOWER",
    phrases: ["slower", "speak slower", "talk slower", "slow down"],
    description: "Decreases the speech rate",
  },
  {
    intent: "FASTER",
    phrases: ["faster", "speak faster", "talk faster", "speed up"],
    description: "Increases the speech rate",
  },
  {
    intent: "NEXT_LESSON",
    phrases: ["next lesson", "next", "continue lesson"],
    description: "Moves to the next lesson",
  },
  {
    intent: "PREVIOUS_LESSON",
    phrases: ["previous lesson", "prior lesson"],
    description: "Moves to the previous lesson",
  },
  {
    intent: "ASK_TUTOR",
    phrases: ["ask tutor", "open tutor", "tutor", "i need help from tutor", "ai tutor"],
    description: "Opens the AI tutor",
  },
  {
    intent: "FIND_JOBS",
    phrases: ["find jobs", "job portal", "search jobs", "jobs", "careers"],
    description: "Opens the job search portal",
  },
  {
    intent: "APPLY",
    phrases: ["apply", "apply to job", "submit application"],
    description: "Starts the application for the current job",
  },
  {
    intent: "GIVE_FEEDBACK",
    phrases: ["give feedback", "feedback", "report problem", "report issue"],
    description: "Starts a feedback message",
  },
  {
    intent: "STOP",
    phrases: ["stop", "pause", "be quiet", "shut up", "cancel"],
    description: "Stops speech or listening immediately",
  },
];

export function parseVoiceCommand(
  transcript: string,
  customCommands: VoiceCommandDefinition[] = [],
): { intent: VoiceCommandIntent; matchedPhrase?: string } {
  const clean = transcript.toLowerCase().trim();
  const allCommands = [...GLOBAL_VOICE_COMMANDS, ...customCommands];

  for (const cmd of allCommands) {
    for (const phrase of cmd.phrases) {
      if (clean === phrase || clean.includes(phrase)) {
        return { intent: cmd.intent, matchedPhrase: phrase };
      }
    }
  }

  return { intent: "UNKNOWN" };
}
