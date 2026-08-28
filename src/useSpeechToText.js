import { useCallback, useMemo, useRef, useState } from 'react';

const SpeechRecognitionImpl =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const SPEECH_TO_TEXT_SUPPORTED = Boolean(SpeechRecognitionImpl);

/**
 * Dictation runs entirely in the browser via the native SpeechRecognition
 * API — no audio ever leaves the device through Eddy's own servers, no API
 * key, no per-message cost. The tradeoff is browser support: Chrome, Edge,
 * and Safari implement it; Firefox does not, so callers should feature-check
 * `SPEECH_TO_TEXT_SUPPORTED` and hide the control rather than show a dead
 * button.
 */
export function useSpeechToText({ lang = 'en-US' } = {}) {
  const [state, setState] = useState('idle'); // idle | listening | error
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const onResultRef = useRef(null);
  const initialTextRef = useRef('');
  const finalTextRef = useRef('');
  const cancelledRef = useRef(false);

  const start = useCallback(
    (currentText, onResult) => {
      if (!SpeechRecognitionImpl || recognitionRef.current) return;

      const recognition = new SpeechRecognitionImpl();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;

      onResultRef.current = onResult;
      initialTextRef.current = currentText ?? '';
      finalTextRef.current = '';
      cancelledRef.current = false;
      setError(null);

      recognition.onstart = () => setState('listening');

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTextRef.current = joinText(finalTextRef.current, transcript);
          } else {
            interim += transcript;
          }
        }
        onResultRef.current?.(joinText(initialTextRef.current, joinText(finalTextRef.current, interim)));
      };

      recognition.onerror = (event) => {
        if (cancelledRef.current || event.error === 'aborted') return;
        if (event.error === 'no-speech') return; // silence alone isn't a failure worth surfacing
        setState('error');
        setError(describeSpeechError(event.error));
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setState((s) => (s === 'error' ? 'error' : 'idle'));
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
        setState('error');
        setError('Could not start the microphone.');
      }
    },
    [lang],
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    if (!recognitionRef.current) return;
    cancelledRef.current = true;
    onResultRef.current?.(initialTextRef.current);
    recognitionRef.current.abort();
  }, []);

  return useMemo(
    () => ({ start, stop, cancel, state, error, supported: SPEECH_TO_TEXT_SUPPORTED }),
    [start, stop, cancel, state, error],
  );
}

function joinText(base, addition) {
  if (!addition) return base;
  const trimmedBase = base.replace(/\s+$/, '');
  return trimmedBase ? `${trimmedBase} ${addition}` : addition;
}

function describeSpeechError(code) {
  switch (code) {
    case 'not-allowed':
    case 'permission-denied':
      return 'Microphone access was blocked. Allow it in your browser’s site settings to use voice input.';
    case 'audio-capture':
      return 'No microphone was found.';
    case 'network':
      return 'Voice input needs an internet connection.';
    default:
      return 'Voice input failed. Try again.';
  }
}
