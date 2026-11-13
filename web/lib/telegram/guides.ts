import "server-only";

export interface GuideTopic {
  id: string;
  title: string;
  steps: string[];
}

export const TELEGRAM_GUIDES: Record<string, GuideTopic> = {
  messages: {
    id: "messages",
    title: "Sending messages and voice notes",
    steps: [
      "1. To type a message, focus the text box at the bottom of the screen.",
      "2. Type your message and press the send button or enter key.",
      "3. To send a voice note, find and hold the microphone button.",
      "4. Speak clearly while holding the button.",
      "5. Release the button to send the voice note.",
    ],
  },
  channels: {
    id: "channels",
    title: "Joining channels",
    steps: [
      "1. Open the search field at the top of your chat list.",
      "2. Type the name or link of the channel you want to join.",
      "3. Select the channel from the search results.",
      "4. Read the recent messages to confirm it is the right channel.",
      "5. Activate the Join Channel button at the bottom.",
    ],
  },
  forwarding: {
    id: "forwarding",
    title: "Forwarding messages and files",
    steps: [
      "1. Move focus to the message or file you want to forward.",
      "2. Open the message menu with a double tap hold or right click.",
      "3. Choose Forward from the action menu.",
      "4. Select the destination chat from your list.",
      "5. Press Send to complete the forward.",
    ],
  },
  settings: {
    id: "settings",
    title: "Changing settings",
    steps: [
      "1. Open the main menu from the top corner of Telegram.",
      "2. Select Settings from the menu list.",
      "3. Choose Notifications and Sounds to change alerts.",
      "4. Choose Chat Settings to adjust text size.",
      "5. Choose Privacy and Security to manage your account details.",
    ],
  },
};

export function formatGuide(topic: GuideTopic): string {
  return [topic.title + ".", ...topic.steps].join("\n");
}

export function getAllGuidesOverview(lang = "en"): string {
  if (lang.startsWith("am")) {
    return [
      "የቴሌግራም መመሪያዎች፦",
      "1. መልዕክት እና ድምጽ መላክ",
      "2. ቻናሎችን መቀላቀል",
      "3. መልዕክቶችን ማስተላለፍ",
      "4. ቅንብሮችን መቀየር",
      "5. የሰው አጋዥ መጠየቅ",
      "የሚፈልጉትን ርዕስ ስም በመጻፍ ዝርዝር መመሪያ ማግኘት ይችላሉ።",
      "ይህ ቦት ሌሎች የግል ውይይቶችዎን ማየት አይችልም።",
    ].join("\n");
  }

  return [
    "Telegram step-by-step guides:",
    "1. Sending messages and voice notes",
    "2. Joining channels",
    "3. Forwarding messages and files",
    "4. Changing settings",
    "5. Asking for a human helper",
    "Type the topic name or number to hear the full guide.",
    "I cannot see your other Telegram chats.",
  ].join("\n");
}
