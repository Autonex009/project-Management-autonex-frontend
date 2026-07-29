import { create } from "zustand";

const useScrollStore = create((set) => ({
  memory: {},
  setMemory: (key, data) =>
    set((state) => ({
      memory: {
        ...state.memory,
        [key]: {
          ...(state.memory[key] || {}),
          ...data,
        },
      },
    })),
  clearMemory: (key) =>
    set((state) => {
      const newMemory = { ...state.memory };
      delete newMemory[key];
      return { memory: newMemory };
    }),
  // Keep these for backward compatibility during the switch if any
  scrollPositions: {},
  setScrollPosition: (key, position) =>
    set((state) => ({
      scrollPositions: {
        ...state.scrollPositions,
        [key]: position,
      },
    })),
}));

export default useScrollStore;
