import { create } from "zustand";

export interface EditCampaignState {
	currentCampaignId?: string;
	setCurrentCampaignId: (id?: string) => void;
	open: boolean;
	setOpen: (open: boolean) => void;
}

const useEditCampaignStore = create<EditCampaignState>()((set) => ({
	currentCampaignId: undefined,
	setCurrentCampaignId: (id) => set({ currentCampaignId: id }),
	open: false,
	setOpen: (open) => set({ open }),
}));

export default useEditCampaignStore;
