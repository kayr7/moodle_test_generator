"use client";

import { useMemo } from "react";

const STORAGE_KEY = "questionNavList";

interface QuestionNavData {
  ids: number[];
  timestamp: number;
}

interface QuestionNavResult {
  prevId: number | null;
  nextId: number | null;
  currentIndex: number;
  total: number;
  hasNav: boolean;
}

/**
 * Store the current filtered/ordered question ID list into sessionStorage.
 * Called from the questions overview page whenever the question list updates.
 */
export function storeQuestionNavList(ids: number[]): void {
  try {
    const data: QuestionNavData = { ids, timestamp: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage might be unavailable (SSR, private browsing limits)
  }
}

/**
 * Read the question nav list from sessionStorage and compute prev/next for the given question ID.
 * Returns hasNav: false if no list is stored or the current ID is not in the list.
 */
export function useQuestionNav(currentId: number | undefined): QuestionNavResult {
  return useMemo(() => {
    const empty: QuestionNavResult = {
      prevId: null,
      nextId: null,
      currentIndex: -1,
      total: 0,
      hasNav: false,
    };

    if (!currentId) return empty;

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return empty;

      const data: QuestionNavData = JSON.parse(raw);
      if (!data.ids || data.ids.length === 0) return empty;

      const index = data.ids.indexOf(currentId);
      if (index === -1) return empty;

      return {
        prevId: index > 0 ? data.ids[index - 1] : null,
        nextId: index < data.ids.length - 1 ? data.ids[index + 1] : null,
        currentIndex: index,
        total: data.ids.length,
        hasNav: true,
      };
    } catch {
      return empty;
    }
  }, [currentId]);
}
