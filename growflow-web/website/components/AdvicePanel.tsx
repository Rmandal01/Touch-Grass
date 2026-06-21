/**
 * AdvicePanel.tsx
 * ---------------
 * Shows the advice/congrats/reminder message for the latest evaluation and can speak it.
 *
 * Audio today uses the browser's built-in Web Speech API (speechSynthesis) so we get spoken
 * feedback without any backend. In production this is replaced by DeepGram TTS via the `tts`
 * Edge Function (see the // TODO(backend) block) so the voice is consistent across browsers
 * and the DeepGram key stays server-side.
 *
 * Props:
 *   - score: the latest ScoreResult, or null
 *
 * Depends on: lib/types.ts.
 */

"use client";

import type { ScoreResult } from "@/lib/types";

interface AdvicePanelProps {
  score: ScoreResult | null;
}

/** Pick an icon for the message kind. */
const KIND_ICON: Record<ScoreResult["messageKind"], string> = {
  congrats: "🎉",
  advice: "💡",
  reminder: "⏰",
};

export default function AdvicePanel({ score }: AdvicePanelProps) {
  if (!score) return null;

  async function speak(text: string) {
    // TODO(backend): replace the Web Speech fallback below with DeepGram TTS via a website
    // API route (keeps the DeepGram key server-side, same pattern as /api/analyze):
    //
    //   const res = await fetch("/api/tts", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ text }),
    //   });
    //   const blob = await res.blob();
    //   const audio = new Audio(URL.createObjectURL(blob));
    //   await audio.play();

    // Local stand-in: speak with the browser's built-in voices.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  }

  return (
    <div className="rounded-xl bg-moss-50 p-4 ring-1 ring-moss-300/50">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {KIND_ICON[score.messageKind]}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium capitalize text-moss-500">{score.messageKind}</p>
          <p className="text-moss-900">{score.advice}</p>
        </div>
        <button
          type="button"
          onClick={() => speak(score.advice)}
          className="shrink-0 rounded-lg bg-moss-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-moss-700"
        >
          🔊 Speak
        </button>
      </div>
    </div>
  );
}
