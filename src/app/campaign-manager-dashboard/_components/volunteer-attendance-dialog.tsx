"use client";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/config/firebase";
import { participationConverter } from "@/lib/utils";
import type { Campaign, Participation } from "@/types";

import { useVolunteerAttendanceDialogStore } from "@/hooks/use-volunteer-attendance-dialog-store";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { format } from "date-fns";
import { doc, updateDoc } from "firebase/firestore";
import { Loader2, User2Icon } from "lucide-react";
import { useShallow } from "zustand/shallow";

interface VolunteerAttendanceDialogProps {
	participations: Participation[];
	campaign: Campaign;
}

export default function VolunteerAttendanceDialog({
	participations,
	campaign,
}: VolunteerAttendanceDialogProps) {
	const { open, setOpen } = useVolunteerAttendanceDialogStore(
		useShallow((state) => ({
			open: state.open,
			setOpen: state.setOpen,
		})),
	);
	const [selectedVolunteers, setSelectedVolunteers] =
		React.useState<Participation[]>(participations);
	const [isPending, setIsPending] = React.useState(false);

	function handleOnValueChange(
		checked: CheckedState,
		participation: Participation,
	) {
		if (checked) {
			setSelectedVolunteers([...selectedVolunteers, participation]);
		} else {
			setSelectedVolunteers(
				selectedVolunteers.filter((sVol) => sVol.id !== participation.id),
			);
		}
	}

	const handleOnMarkAsDone = async () => {
		setIsPending(true);
		const campaignRef = doc(db, "campaigns", campaign.id);

		if (selectedVolunteers.length >= 1) {
			for (const volunteer of selectedVolunteers) {
				const participationRef = doc(
					db,
					"participation",
					volunteer.id,
				).withConverter(participationConverter);
				await updateDoc(participationRef, {
					isPresent: true,
				});
			}

			await updateDoc(campaignRef, {
				isDone: true,
			});

			setIsPending(true);
			setOpen(false);
			return;
		}

		await updateDoc(campaignRef, {
			isDone: true,
		}).finally(() => {
			setIsPending(true);
			setOpen(false);
			window.location.reload();
		});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Attendance of Joined Volunteers</DialogTitle>
					<DialogDescription>
						Manage the attendance of joined volunteers
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="h-full max-h-80">
					<div className="flex flex-col gap-2">
						{participations.length >= 1 ? (
							participations.map((participation) => (
								<div key={participation.id} className="flex items-center gap-2">
									<Checkbox
										id={participation.id}
										checked={selectedVolunteers.some(
											(sVol) => sVol.id === participation.id,
										)}
										onCheckedChange={(checked) =>
											handleOnValueChange(checked, participation)
										}
									/>
									<Avatar>
										<AvatarImage
											src={participation.profilepictureURL}
											alt="profile_picture"
										/>
										<AvatarFallback>
											<User2Icon />
										</AvatarFallback>
									</Avatar>
									<div className="text-xs">
										<Label
											className="flex items-center gap-1"
											htmlFor={participation.id}
										>
											<p>{participation.displayName}</p>
											<img
												className="inline-block size-4"
												src={participation.frameTier}
												alt="frame"
											/>
										</Label>

										<p className="text-muted-foreground">
											{format(
												participation.joindate.toDate(),
												"'Joined at' MMM dd, yyyy",
											)}
										</p>
									</div>
								</div>
							))
						) : (
							<div className="flex justify-center">
								<p className="text-muted-foreground">
									No joined volunteers to show
								</p>
							</div>
						)}
					</div>
				</ScrollArea>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="ghost">Close</Button>
					</DialogClose>
					<Button onClick={handleOnMarkAsDone} disabled={isPending}>
						{isPending && <Loader2 className="size-4 animate-spin" />} Mark as
						done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
