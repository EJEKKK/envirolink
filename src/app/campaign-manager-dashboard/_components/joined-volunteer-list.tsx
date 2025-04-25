"use client";
import Image from "next/image";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db } from "@/config/firebase";
import { getFrame } from "@/helper";
import type { Campaign, Participation, User } from "@/types";

import { format } from "date-fns";
import { deleteDoc, doc } from "firebase/firestore";
import { Loader2Icon, TrashIcon } from "lucide-react";

interface JoinedVolunteerListProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  participations: Participation[];
  user: User;
  campaign: Campaign;
}

export default function JoinedVolunteerList({
  open,
  onOpenChange,
  participations,
  user,
  campaign,
}: JoinedVolunteerListProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleOnRemoveVolunteer = async (participationId: string) => {
    setIsDeleting(true);
    const participationRef = doc(db, "participation", participationId);

    await deleteDoc(participationRef).finally(() => {
      setIsDeleting(false);
      onOpenChange?.(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Joined Volunteers</DialogTitle>
          <DialogDescription>
            List of joined volunteers for this campaign.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {participations.length >= 1 ? (
            participations.map((participation) => (
              <div
                key={participation.id}
                className="flex items-center justify-between p-2"
              >
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage
                      src={participation.profilepictureURL}
                      alt={participation.displayName}
                    />
                    <AvatarFallback>
                      {participation.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm">{participation.displayName}</p>
                      <Image
                        src={getFrame(participation.frameTier)}
                        alt={participation.frameTier}
                        priority
                        height={18}
                        width={18}
                      />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {format(
                        participation.joindate.toDate(),
                        "'Joined at' MMM dd, yyyy",
                      )}
                    </p>
                  </div>
                </div>

                {user.uid === campaign.managerUid && (
                  <Button
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => handleOnRemoveVolunteer(participation.id)}
                  >
                    {isDeleting ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <TrashIcon />
                    )}{" "}
                    Remove volunteer
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p className="text-center">No volunteers joined this campaign.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
