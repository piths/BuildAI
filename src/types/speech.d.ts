// Minimal Web Speech API typings (not in the default DOM lib).

interface SpeechRecognitionResultLike {
  readonly transcript: string;
}

interface SpeechRecognitionAlternativeList {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionResultEvent {
  readonly results: ArrayLike<SpeechRecognitionAlternativeList>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognitionInstance;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionStatic;
  webkitSpeechRecognition?: SpeechRecognitionStatic;
}
