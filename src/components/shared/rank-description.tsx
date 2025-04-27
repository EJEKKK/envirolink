"use client";
import * as React from "react";

import { db } from "@/config/firebase";
import { AspectRatio } from "../ui/aspect-ratio";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { formatCompactNumber, rankDescriptionConverter } from "@/lib/utils";
import type { RankDescription } from "@/types";

interface RankDescriptionDialogProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function RankDescriptionDialog({
  open,
  onOpenChange,
}: RankDescriptionDialogProps) {
  const [ranks, setRanks] = React.useState<RankDescription[]>([]);

  React.useEffect(() => {
    const rankRef = collection(db, "rankDescription").withConverter(
      rankDescriptionConverter,
    );
    const q = query(rankRef, orderBy("createdAt", "asc"));
    const unsubRankDescriptions = onSnapshot(q, (snapshot) => {
      const rankDescriptions: RankDescription[] = [];

      for (const doc of snapshot.docs) {
        rankDescriptions.push({ ...doc.data(), id: doc.id });
      }

      setRanks(rankDescriptions);
    });

    return () => unsubRankDescriptions();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-fit sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Rank Description</DialogTitle>
          <DialogDescription>
            This is the description of the rank.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-fit min-w-full">
          <div className="flex items-center justify-center gap-4 text-center">
            {ranks.length === 0 ? (
              <Loader2 className="animate-spin" />
            ) : (
              ranks.map((rank, index) => (
                <div
                  key={rank.id}
                  className="flex flex-col items-center justify-center gap-2"
                >
                  <div className="relative w-40">
                    <AspectRatio ratio={1 / 1}>
                      <img src={rank.image} alt={rank.name} />
                    </AspectRatio>
                  </div>
                  <p className="text-sm font-bold">{rank.name}</p>
                  <small className="text-muted-foreground">
                    {ranks.length - 1 > index
                      ? `${formatCompactNumber(rank.points)} -`
                      : null}
                    {ranks.length - 1 === index
                      ? `${formatCompactNumber(rank.points)}+`
                      : formatCompactNumber(
                          (ranks[index + 1]?.points as number) - 1,
                        )}{" "}
                    points
                  </small>
                </div>
              ))
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
