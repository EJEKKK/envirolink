import { create } from "zustand";

export interface CreateCampaignState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const useCreateCampaignStore = create<CreateCampaignState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export default useCreateCampaignStore;
