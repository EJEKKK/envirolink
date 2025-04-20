"use client";
import Image from "next/image";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/config/firebase";
import { getFrame } from "@/helper";
import type { Participation } from "@/types";
import { type ScoreFormSchema, scoreFormSchema } from "../_lib/validations";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { doc, increment, updateDoc } from "firebase/firestore";
import { Loader2, PlusCircleIcon, User2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface VolunteerAttendanceDialogProps {
  participations: Participation[];
}

export default function VolunteerAttendanceDialog({
  participations,
}: VolunteerAttendanceDialogProps) {
  const form = useForm<ScoreFormSchema>({
    resolver: zodResolver(scoreFormSchema),
    defaultValues: { score: 1 },
  });

  const [isPending, setIsPending] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const handleOnAddScore = async (values: ScoreFormSchema) => {
    setIsPending(true);

    for (const participation of participations) {
      const userRef = doc(db, "users", participation.uid);

      await updateDoc(userRef, {
        points: increment(values.score),
      });
    }

    const campaignRef = doc(
      db,
      "campaigns",
      participations[0]?.campaignid ?? "",
    );

    await updateDoc(campaignRef, { isScoreApplied: true }).finally(() => {
      setIsPending(false);
      setOpen(false);
      toast.success("Score added successfully");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusCircleIcon /> Add score
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attendance of Joined Volunteers</DialogTitle>
          <DialogDescription>
            Add score for volunteers that were present during the campaign event
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full max-h-80">
          <div className="space-y-4">
            <Form {...form}>
              <form className="flex flex-wrap items-center">
                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem className="flex w-full items-center justify-between">
                      <FormLabel className="text-nowrap">Add Score</FormLabel>

                      <FormControl>
                        <Input
                          className="w-fit"
                          type="number"
                          min={1}
                          {...field}
                          placeholder="Input your score here"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            {participations.length >= 1 ? (
              participations.map((participation) => (
                <div key={participation.id} className="flex items-center gap-2">
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
                    <div className="flex items-center gap-1">
                      <p>{participation.displayName}</p>
                      <Image
                        className="inline-block size-4"
                        src={getFrame(participation.frameTier)}
                        alt="frame"
                        priority
                        height={20}
                        width={20}
                      />
                    </div>

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
          <Button
            onClick={form.handleSubmit(handleOnAddScore)}
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />} Apply
            score
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
