"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db } from "@/config/firebase";
import { campaignConverter, userConverter } from "@/lib/utils";
import type { Campaign } from "@/types";
import type { pointFormSchema } from "../../_lib/validations";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  updateDoc,
} from "firebase/firestore";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

interface AcceptCampaignDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AcceptCampaignDialog({
  campaign,
  open,
  onOpenChange,
}: AcceptCampaignDialogProps) {
  const form = useFormContext<z.infer<typeof pointFormSchema>>();

  // Handle accepting a campaign and updating points
  const handleOnAccept = async (values: z.infer<typeof pointFormSchema>) => {
    try {
      const campaignRef = doc(db, "campaigns", campaign.id).withConverter(
        campaignConverter,
      );
      const campaignSnap = await getDoc(campaignRef);
      const campaignData = campaignSnap.data();

      await updateDoc(campaignRef, { status: "approved" });

      await addDoc(collection(db, "campaigns", campaign.id, "points"), {
        like: Number(values.points.like) ?? 0,
        comment: Number(values.points.comment) ?? 0,
        share: Number(values.points.share) ?? 0,
      });

      // Award 50 points to the manager
      const managerRef = doc(
        db,
        "users",
        campaignData!.managerUid,
      ).withConverter(userConverter);
      await updateDoc(managerRef, {
        points: increment(Number(values.points.campaignManager)),
      });

      toast.success("Campaign approved successfully.");
    } catch (error) {
      console.error("Error approving campaign:", error);
      toast.error("Error approving campaign. Please try again.");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Accept Campaign</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to approve this campaign?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={form.handleSubmit(handleOnAccept)}>
            Accept
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
