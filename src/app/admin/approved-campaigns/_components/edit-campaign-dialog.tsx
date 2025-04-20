import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/config/firebase";
import { campaignConverter } from "@/lib/utils";
import type { Campaign } from "@/types";
import {
  type EditPointFormSchema,
  editPointFormSchema,
} from "../../_lib/validations";

import { zodResolver } from "@hookform/resolvers/zod";
import { doc, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

interface EditCampaignDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function EditCampaignDialog({
  campaign,
  open,
  onOpenChange,
}: EditCampaignDialogProps) {
  const form = useForm<EditPointFormSchema>({
    resolver: zodResolver(editPointFormSchema),
    defaultValues: {
      points: {
        like: campaign.points.like ?? 0,
        comment: campaign.points.comment ?? 0,
        share: campaign.points.share ?? 0,
        join: campaign.points.join ?? 0,
      },
    },
  });
  const [isPending, setIsPending] = React.useState(false);

  const handleOnSaveChanges = async (values: EditPointFormSchema) => {
    setIsPending(true);
    const campaignPointsRef = doc(
      db,
      "campaigns",
      campaign.id,
      "points",
      campaign.points.id,
    ).withConverter(campaignConverter);

    await updateDoc(campaignPointsRef, values.points).finally(() => {
      setIsPending(false);
      open = false;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Campaign Scores</DialogTitle>
          <DialogDescription>
            Input new scores directly into editable fields
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full max-h-96">
          <Form {...form}>
            <form className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="points.like"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Like</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points.comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comment</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points.share"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Share</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points.join"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Join</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Close</Button>
          </DialogClose>
          <Button
            disabled={isPending}
            onClick={form.handleSubmit(handleOnSaveChanges)}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />} Save
            changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
