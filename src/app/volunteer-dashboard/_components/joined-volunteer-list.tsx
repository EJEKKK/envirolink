"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Participation } from "@/types";

import { format } from "date-fns";

interface JoinedVolunteerListProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  participations: Participation[];
}

export default function JoinedVolunteerList({
  open,
  onOpenChange,
  participations,
}: JoinedVolunteerListProps) {
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
                      {participation.rankImage.length > 0 && (
                        <img
                          className="size-4"
                          src={participation.rankImage ?? ""}
                          alt={participation.frameTier}
                        />
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {format(
                        participation?.joindate?.toDate() ?? new Date(),
                        "'Joined at' MMM dd, yyyy",
                      )}
                    </p>
                  </div>
                </div>
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
