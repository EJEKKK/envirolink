"use client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useEditCampaignStore from "@/hooks/use-edit-campaign-store";
import { useVolunteerAttendanceDialogStore } from "@/hooks/use-volunteer-attendance-dialog-store";
import type { Campaign } from "@/types";

import { CheckCircleIcon, Edit2Icon, EllipsisVerticalIcon } from "lucide-react";

interface CampaignDropdownMenuProps {
	campaign: Campaign;
}

export default function CampaignDropdownMenu({
	campaign,
}: CampaignDropdownMenuProps) {
	const setEditCampaignId = useEditCampaignStore(
		(state) => state.setCurrentCampaignId,
	);
	const setEditCampaignOpen = useEditCampaignStore((state) => state.setOpen);
	const setVolunteerAttendanceOpen = useVolunteerAttendanceDialogStore(
		(state) => state.setOpen,
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon">
					<EllipsisVerticalIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					onClick={() => {
						setEditCampaignOpen(true);
						setEditCampaignId(campaign.id);
					}}
				>
					<Edit2Icon /> Edit campaign
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setVolunteerAttendanceOpen(true)}>
					<CheckCircleIcon /> Mark as Done
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
