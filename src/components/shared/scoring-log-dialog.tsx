"use client";
import Image from "next/image";
import * as React from "react";

import { db } from "@/config/firebase";
import { getFrame } from "@/helper";
import { useIsClient } from "@/hooks/use-is-client";
import { useScoreLogStore } from "@/hooks/use-score-log-store";
import { scoreHistoryLogConverter } from "@/lib/utils";
import type { ScoreHistoryLog, User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";

import { format } from "date-fns";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useShallow } from "zustand/shallow";
import { Loader2Icon } from "lucide-react";

interface ScoringLogDialogProps {
  user: User;
}

export default function ScoringLogDialog({ user }: ScoringLogDialogProps) {
  const [open, setOpen] = useScoreLogStore(
    useShallow((state) => [state.open, state.setOpen]),
  );
  const [scoreLogs, setScoreLogs] = React.useState<ScoreHistoryLog[]>([]);
  const [isFetching, setIsFetching] = React.useState(false);
  const isClient = useIsClient();

  React.useEffect(() => {
    if (!isClient) return;

    setIsFetching(true);

    const scoreLogsRef = collection(db, "scoreLog").withConverter(
      scoreHistoryLogConverter,
    );
    const q = query(
      scoreLogsRef,
      orderBy("createdAt", "desc"),
      where("uid", "==", user.uid),
    );

    const unsub = onSnapshot(q, (querySnapshot) => {
      const scoreLogs: ScoreHistoryLog[] = [];

      for (const doc of querySnapshot.docs) {
        scoreLogs.push({ ...doc.data(), id: doc.id });
      }
      setScoreLogs(scoreLogs);
      setIsFetching(false);
    });

    return () => unsub();
  }, [user, isClient]);

  if (!isClient) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Your Scoring Log</DialogTitle>
          <DialogDescription>
            You can find the logging scores listed below.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full max-h-96">
          <div className="flex flex-col gap-4">
            {isFetching ? (
              <Loader2Icon className="text-primary animate-spin" />
            ) : (
              scoreLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="flex items-center gap-2">
                    <Avatar>
                      <AvatarImage
                        src={log.profilepictureURL}
                        alt="User Profile Picture"
                      />
                      <AvatarFallback>
                        <Skeleton className="size-full" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="grow">
                      <div className="flex items-center gap-1">
                        <p>{log.displayName}</p>
                        <Image
                          src={getFrame(log.frameTier)}
                          alt="Frame Tier"
                          width={20}
                          height={20}
                        />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {log.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <small>{`${log.type.charAt(0).toUpperCase()}${log.type.slice(1)} - ${log.score} pts`}</small>
                      <small className="text-muted-foreground text-sm">
                        {format(
                          log.createdAt?.toDate() ?? new Date(),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </small>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
