"use client";
import Image from "next/image";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { db } from "@/config/firebase";
import { useIsClient } from "@/hooks/use-is-client";
import { formatCompactNumber, rankDescriptionConverter } from "@/lib/utils";
import type { RankDescription } from "@/types";
import CreateRankDialog from "./_components/create-rank-dialog-form";
import EditRankDialog from "./_components/edit-rank-dialog-form";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Loader2Icon, PlusCircleIcon, Trash2Icon } from "lucide-react";
import DeleteRankDialog from "./_components/delete-rank-dialog";

export default function RankDescriptionPage() {
  const [ranks, setRanks] = React.useState<RankDescription[]>([]);
  const [isFetching, setIsFetching] = React.useState(false);
  const isClient = useIsClient();

  React.useEffect(() => {
    setIsFetching(true);
    const ranksRef = collection(db, "rankDescription").withConverter(
      rankDescriptionConverter,
    );
    const q = query(
      ranksRef,
      orderBy("createdAt", "desc"),
      orderBy("points", "desc"),
    );

    const unsubRanks = onSnapshot(q, (snapshot) => {
      const ranksData: RankDescription[] = [];

      for (const doc of snapshot.docs) {
        ranksData.push({ ...doc.data(), id: doc.id });
      }

      setRanks(ranksData);
      setIsFetching(false);
    });

    return () => {
      unsubRanks();
    };
  }, []);

  if (!isClient) return null;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <h4 className="text-lg font-semibold">Rank Description</h4>
        </div>

        <CreateRankDialog />
      </header>
      <main className="mt-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {!isFetching ? (
            ranks.length >= 1 ? (
              ranks.map((rank) => (
                <Card key={rank.id}>
                  <CardContent className="flex flex-col items-center gap-4">
                    <img className="w-20" src={rank.image} alt={rank.name} />
                    <div className="text-center">
                      <p>{rank.name}</p>
                      <p className="text-primary">
                        {formatCompactNumber(rank.points)} points
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex w-full flex-col gap-2">
                    <EditRankDialog rank={rank} />
                    <DeleteRankDialog rankId={rank.id} />
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="text-muted-foreground flex flex-col items-center justify-center gap-4 rounded-md border border-dashed p-4 sm:col-span-2 md:col-span-3">
                <Image
                  className="w-40"
                  src="/illustrations/create-empty-state.svg"
                  alt="create rank"
                  priority
                  height={40}
                  width={40}
                />
                <h4 className="text-lg font-semibold">
                  No ranks have been created yet
                </h4>
                <CreateRankDialog />
              </div>
            )
          ) : (
            <div className="flex items-center justify-center p-4 sm:col-span-2 md:col-span-3">
              <Loader2Icon className="text-primary animate-spin" />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
