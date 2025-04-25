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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { db } from "@/config/firebase";

import { deleteDoc, doc } from "firebase/firestore";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

interface DeleteRankDialogProps {
  rankId: string;
}

export default function DeleteRankDialog({ rankId }: DeleteRankDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteRank = async () => {
    setIsDeleting(true);
    const rankRef = doc(db, "rankDescription", rankId);

    await deleteDoc(rankRef).finally(() => {
      toast.success("Rank deleted successfully!");
      setIsDeleting(false);
      setIsOpen(false);
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button className="w-full" variant="destructive">
          <Trash2Icon /> Delete Rank
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will no be undone. This will delete all the rank data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDeleteRank}
          >
            {isDeleting && <Loader2Icon className="animate-spin" />} Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
