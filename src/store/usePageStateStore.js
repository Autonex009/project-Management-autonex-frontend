import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const TTL_MS = 10 * 60 * 1000; // 10 minutes

const ttlStorage = {
  getItem: (name) => {
    const raw = sessionStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.expiry != null) {
        if (Date.now() > parsed.expiry) {
          sessionStorage.removeItem(name);
          return null;
        }
        return JSON.stringify(parsed.state);
      }
      return raw;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    sessionStorage.setItem(
      name,
      JSON.stringify({
        state: JSON.parse(value),
        expiry: Date.now() + TTL_MS,
      })
    );
  },
  removeItem: (name) => sessionStorage.removeItem(name),
};

const usePageStateStore = create(
  persist(
    (set, get) => ({
      pages: {},
      setPageState: (key, partial) =>
        set((state) => ({
          pages: {
            ...state.pages,
            [key]: { ...(state.pages[key] || {}), ...partial },
          },
        })),
      getPageState: (key) => get().pages[key] || {},
      clearPage: (key) =>
        set((state) => {
          const next = { ...state.pages };
          delete next[key];
          return { pages: next };
        }),
      clearAll: () => set({ pages: {} }),
    }),
    {
      name: "page-ui-state",
      storage: createJSONStorage(() => ttlStorage),
      partialize: (state) => ({ pages: state.pages }),
    }
  )
);

export default usePageStateStore;