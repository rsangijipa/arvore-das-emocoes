"use client";

import { useCallback, useMemo, useState } from "react";

import { postInteraction } from "@/lib/client/interactions-api";
import type { Emotion, EmotionalActivity, EmotionalSession } from "@/types/emotional-session";

const STORAGE_PREFIX = "arvore-emotional-session:";

function createSession(): EmotionalSession {
  return { activities: [], startedAt: new Date().toISOString() };
}

export function useEmotionalSession(sessionId: string) {
  const [session, setSession] = useState<EmotionalSession>(createSession);

  const persist = useCallback((next: EmotionalSession) => {
    setSession(next);
    if (sessionId) window.localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, JSON.stringify(next));
  }, [sessionId]);

  const checkIn = useCallback((emotion: Emotion, intensity: number) => {
    const next = { ...session, emotionBefore: emotion, intensityBefore: intensity };
    persist(next);
    if (sessionId) void postInteraction({ sessionId, actionType: "emotion_selected", emotion, intensity });
  }, [persist, session, sessionId]);

  const checkOut = useCallback((emotion: Emotion, intensity: number) => {
    const next = { ...session, emotionAfter: emotion, intensityAfter: intensity, completedAt: new Date().toISOString() };
    persist(next);
    if (sessionId) void postInteraction({ sessionId, actionType: "emotion_checkout", emotion, intensity });
  }, [persist, session, sessionId]);

  const addActivity = useCallback((activity: EmotionalActivity) => {
    const next = { ...session, activities: [...session.activities, activity] };
    persist(next);
    if (sessionId) void postInteraction({ sessionId, actionType: activity.completed ? "regulation_completed" : "regulation_abandoned", activityType: activity.type, durationMs: activity.durationMs });
  }, [persist, session, sessionId]);

  const startActivity = useCallback((type: EmotionalActivity["type"]) => {
    if (sessionId) void postInteraction({ sessionId, actionType: "regulation_started", activityType: type });
  }, [sessionId]);

  return useMemo(() => ({ session, checkIn, checkOut, addActivity, startActivity }), [addActivity, checkIn, checkOut, session, startActivity]);
}
