import { create } from "zustand";

type ScoreLogDialogState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useScoreLogStore = create<ScoreLogDialogState>((set) => ({
  open: false,
  setOpen: (open: boolean) => set({ open }),
}));
