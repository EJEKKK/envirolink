"use client";
import * as React from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { db } from "@/config/firebase";
import type { Campaign } from "@/types";

import { deleteDoc, doc } from "firebase/firestore";
import { toast } from "sonner";

interface RejectCampaignDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function RejectCampaignDialog({
  campaign,
  open,
  onOpenChange,
}: RejectCampaignDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleOnReject = async () => {
    setIsLoading(true);
    try {
      const campaignRef = doc(db, "campaigns", campaign!.id);
      await deleteDoc(campaignRef);
      toast.success("Campaign rejected successfully.");
      setIsLoading(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error rejecting campaign:", error);
      toast.error("Error rejecting campaign. Please try again.");
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Campaign</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reject this campaign?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isLoading}
            onClick={() => void handleOnReject()}
          >
            Reject
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
