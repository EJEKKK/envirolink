"use client";

import { AspectRatio } from "../ui/aspect-ratio";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";

interface RankDescriptionDialogProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function RankDescriptionDialog({
  open,
  onOpenChange,
}: RankDescriptionDialogProps) {
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
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="relative w-40">
                <AspectRatio ratio={1 / 1}>
                  <img src="/badges/BRONZE.png" alt="frame tier" />
                </AspectRatio>
              </div>
              <p className="text-sm font-bold">Bronze</p>
              <small className="text-muted-foreground">0 - 500 points</small>
            </div>
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="relative w-40">
                <AspectRatio ratio={1 / 1}>
                  <img src="/badges/SILVER.png" alt="frame tier" />
                </AspectRatio>
              </div>
              <p className="text-sm font-bold">Silver</p>
              <small className="text-muted-foreground">501 - 1500 points</small>
            </div>
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="relative w-40">
                <AspectRatio ratio={1 / 1}>
                  <img src="/badges/GOLD.png" alt="frame tier" />
                </AspectRatio>
              </div>
              <p className="text-sm font-bold">Gold</p>
              <small className="text-muted-foreground">
                1501 - 3500 points
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
                3501 - 5000 points
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
                5001 - 10000+ points
              </small>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
