"use client";

import { createContext, useContext, useState, useCallback } from "react";

type NewsContextType = {
  isNewsOpen: boolean;
  toggleNews: () => void;
  openNews: () => void;
  closeNews: () => void;
};

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export function NewsProvider({ children }: { children: React.ReactNode }) {
  const [isNewsOpen, setIsNewsOpen] = useState(false);

  const toggleNews = useCallback(() => setIsNewsOpen((v) => !v), []);
  const openNews = useCallback(() => setIsNewsOpen(true), []);
  const closeNews = useCallback(() => setIsNewsOpen(false), []);

  return (
    <NewsContext.Provider value={{ isNewsOpen, toggleNews, openNews, closeNews }}>
      {children}
    </NewsContext.Provider>
  );
}

export function useNews() {
  const ctx = useContext(NewsContext);
  if (!ctx) throw new Error("useNews must be inside NewsProvider");
  return ctx;
}
