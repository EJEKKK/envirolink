import { create } from "zustand";

interface VoluntteerAttendanceDialogStore {
	open: boolean;
	setOpen: (open: boolean) => void;
}

export const useVolunteerAttendanceDialogStore =
	create<VoluntteerAttendanceDialogStore>()((set) => ({
		open: false,
		setOpen: (open: boolean) => set({ open }),
	}));
