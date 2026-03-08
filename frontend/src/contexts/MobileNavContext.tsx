"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type MobileNavContextType = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

const MobileNavContext = createContext<MobileNavContextType | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);
  return (
    <MobileNavContext.Provider value={{ sidebarOpen, setSidebarOpen, toggleSidebar }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) return { sidebarOpen: false, setSidebarOpen: () => {}, toggleSidebar: () => {} };
  return ctx;
}
