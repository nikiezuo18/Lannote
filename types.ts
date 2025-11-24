
export type TargetLanguage = 'Korean' | 'Japanese';

export interface VocabCard {
  id: string;
  term: string;       // Was 'korean'
  definition: string; // Was 'english'
  language: TargetLanguage;
  category: string;
  dateAdded: string;
  details?: VocabDetails;
  studyState?: {
    lastReviewed?: string;
    status: 'new' | 'learning' | 'review' | 'mastered';
    reviewCount: number;
  };
}

export interface VocabDetails {
  explanation?: string;
  imageUrl?: string;     // Base64 string
  imageMimeType?: string; // e.g. 'image/png'
  audioBase64?: string;  // Base64 string for TTS
  sampleConversation?: ConversationLine[];
  grammar?: GrammarInfo[];
}

export interface GrammarInfo {
  tense: string;
  conjugation: string;
  example: string;
}

export interface ConversationLine {
  speaker: string;
  term: string;       // Was 'korean'
  definition: string; // Was 'english'
}

export interface ParsedVocabItem {
  term: string;
  definition: string;
  category: string;
}

export interface DocSource {
  id: string;
  name: string;
  url: string;
  lastSynced: string | null;
}

export type ViewMode = 'parser' | 'library' | 'study' | 'settings';
