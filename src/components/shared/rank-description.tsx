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

import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

interface RankDescriptionDialogProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function RankDescriptionDialog({
  open,
  onOpenChange,
}: RankDescriptionDialogProps) {
  const [rankPoints, setRankPoints] = React.useState<number[]>([]);

  React.useEffect(() => {
    async function fetchRankPoints() {
      const rankPoints: Awaited<number[]> = (await Promise.all([
        (await getDoc(doc(db, "rankDescription", "silver")))?.data()
          ?.points as Awaited<number>,
        (await getDoc(doc(db, "rankDescription", "gold")))?.data()
          ?.points as Awaited<number>,
        (await getDoc(doc(db, "rankDescription", "platinum")))?.data()
          ?.points as Awaited<number>,
        (await getDoc(doc(db, "rankDescription", "diamond")))?.data()
          ?.points as Awaited<number>,
      ])) as number[];

      if (rankPoints.length > 0) {
        setRankPoints(rankPoints);
      }
    }

    void fetchRankPoints();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Rank Description</DialogTitle>
          <DialogDescription>
            This is the description of the rank.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-fit min-w-full">
          <div className="flex items-center justify-center gap-4 text-center">
            {rankPoints.length === 0 ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="relative w-40">
                    <AspectRatio ratio={1 / 1}>
                      <img src="/badges/BRONZE.png" alt="frame tier" />
                    </AspectRatio>
                  </div>
                  <p className="text-sm font-bold">Bronze</p>
                  <small className="text-muted-foreground">
                    0 - {(rankPoints[0] as number) - 1} points
                  </small>
                </div>
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="relative w-40">
                    <AspectRatio ratio={1 / 1}>
                      <img src="/badges/SILVER.png" alt="frame tier" />
                    </AspectRatio>
                  </div>
                  <p className="text-sm font-bold">Silver</p>
                  <small className="text-muted-foreground">
                    {rankPoints[0] as number} - {(rankPoints[1] as number) - 1}{" "}
                    points
                  </small>
                </div>
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="relative w-40">
                    <AspectRatio ratio={1 / 1}>
                      <img src="/badges/GOLD.png" alt="frame tier" />
                    </AspectRatio>
                  </div>
                  <p className="text-sm font-bold">Gold</p>
                  <small className="text-muted-foreground">
                    {rankPoints[1] as number} - {(rankPoints[2] as number) - 1}{" "}
                    points
                  </small>
                </div>
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="relative w-40">
                    <AspectRatio ratio={1 / 1}>
                      <img src="/badges/PLATINUM.png" alt="frame tier" />
                    </AspectRatio>
                  </div>
                  <p className="text-sm font-bold">Platinum</p>
                  <small className="text-muted-foreground">
                    {rankPoints[2] as number} - {(rankPoints[3] as number) - 1}{" "}
                    points
                  </small>
                </div>
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="relative w-40">
                    <AspectRatio ratio={1 / 1}>
                      <img src="/badges/DIAMOND.png" alt="frame tier" />
                    </AspectRatio>
                  </div>
                  <p className="text-sm font-bold">Diamond</p>
                  <small className="text-muted-foreground">
                    {rankPoints[3] as number}+ points
                  </small>
                </div>
              </>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
