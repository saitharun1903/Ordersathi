// Demo fixtures: predefined sample files with known transcripts. In demo mode
// (no provider credentials) only these exact files are recognised — matched by
// SHA-256 — so the app never fabricates a result for an arbitrary upload.

export type Fixture = {
  id: string;
  kind: "AUDIO" | "IMAGE";
  file: string; // under /public/samples
  title: string;
  description: string;
  language: "en" | "te" | "mixed";
  transcript: string;
};

export const FIXTURES: Fixture[] = [
  {
    id: "voice-sai-en",
    kind: "AUDIO",
    file: "voice-note-sai-electricals.wav",
    title: "Voice note · Sai Electricals",
    description: "English voice message with brands and ratings (synthetic demo audio)",
    language: "en",
    transcript:
      "Hello sir, this is Ravi from Sai Electricals. Please send ten Anchor Roma six amp one way switches, five sockets, two rolls of Polycab two point five square mm red wire, and one box of Philips nine watt bulbs. Thank you.",
  },
  {
    id: "photo-venkat-mixed",
    kind: "IMAGE",
    file: "handwritten-list-venkateswara.png",
    title: "Handwritten list · Venkateswara",
    description: "Photo of a handwritten Telugu + English list",
    language: "mixed",
    transcript:
      "Havells 16A MCB - 6\nపది ఆంకర్ స్విచ్‌లు\n1.5 ఎర్ర వైరు రెండు చుట్టలు\nTape 15 pcs\nCrompton fan 2\n5 katta wire",
  },
];
