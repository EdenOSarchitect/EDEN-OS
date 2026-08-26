import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Marble } from "@/lib/eden";

interface MarbleState {
  session: Marble[];
  push: (m: Marble) => void;
  clearSession: () => void;
}

export const useMarbleLedger = create<MarbleState>()(
  persist(
    (set, get) => ({
      session: [],
      push: (m) => {
        const prev = get().session;
        if (prev.some((x) => x.runId === m.runId)) return;
        set({ session: [m, ...prev].slice(0, 40) });
      },
      clearSession: () => set({ session: [] }),
    }),
    { name: "eden.marble-ledger.v1" },
  ),
);
