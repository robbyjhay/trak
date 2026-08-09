"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE_TRANSCRIPT } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */
type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalRef = useRef("");
  const liveOk = useRef(false);
  const recordingRef = useRef(false);

  useEffect(() => {
    const w = typeof window !== "undefined" ? (window as any) : null;
    const SRCtor = w?.SpeechRecognition || w?.webkitSpeechRecognition;
    if (SRCtor) {
      try {
        const rec = new SRCtor() as RecognitionLike;
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-NG";
        recognitionRef.current = rec;
        liveOk.current = true;
        setSupported(true);
      } catch {
        liveOk.current = false;
        setSupported(false);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const start = useCallback(() => {
    setIsRecording(true);
    recordingRef.current = true;
    setSeconds(0);
    finalRef.current = "";
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    const rec = recognitionRef.current;
    if (rec && liveOk.current) {
      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalRef.current += e.results[i][0].transcript + " ";
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        setTranscript((finalRef.current + interim).trim());
      };
      rec.onerror = () => {
        liveOk.current = false;
      };
      rec.onend = () => {
        if (recordingRef.current && liveOk.current) {
          try {
            rec.start();
          } catch {
            /* ignore */
          }
        }
      };
      try {
        rec.start();
      } catch {
        liveOk.current = false;
      }
    }
  }, []);

  const stop = useCallback(() => {
    setIsRecording(false);
    recordingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setTranscript((t) => (t.trim() ? t : SAMPLE_TRANSCRIPT));
  }, []);

  const toggle = useCallback(() => {
    if (isRecording) stop();
    else start();
  }, [isRecording, start, stop]);

  const timerLabel =
    String(Math.floor(seconds / 60)).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0");

  return {
    isRecording,
    seconds,
    timerLabel,
    transcript,
    setTranscript,
    supported,
    toggle,
    start,
    stop,
  };
}
