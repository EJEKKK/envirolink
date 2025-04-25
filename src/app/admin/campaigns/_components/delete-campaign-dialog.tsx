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

import { deleteDoc, doc } from "firebase/firestore";
import { toast } from "sonner";

interface DeleteCampaignDialogProps {
  campaignId: string;
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function DeleteCampaignDialog({
  campaignId,
  open,
  onOpenChange,
}: DeleteCampaignDialogProps) {
  const handleOnDeleteCampaign = async () => {
    const campaignRef = doc(db, "campaigns", campaignId);
    await deleteDoc(campaignRef);
    toast.success("Campaign deleted successfully!");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this campaign?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleOnDeleteCampaign()}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
