"use client";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { auth, db } from "@/config/firebase";
import useCreateCampaignStore from "@/hooks/use-create-campaign-store";
import { cn, formatCompactNumber, rankDescriptionConverter } from "@/lib/utils";
import type { RankDescription, User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import RankDescriptionDialog from "./rank-description";

import { useScoreLogStore } from "@/hooks/use-score-log-store";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  BadgeInfo,
  ChevronDown,
  HistoryIcon,
  LogOutIcon,
  PlusCircle,
  User2Icon,
} from "lucide-react";

interface NavbarProps {
  user: User;
}

export default function Navbar({ user }: NavbarProps) {
  const setOpenScoreLog = useScoreLogStore((state) => state.setOpen);
  const setOpenCreateCampaign = useCreateCampaignStore(
    (state) => state.setOpen,
  );
  const [open, setOpen] = React.useState(false);
  const [rankImage, setRankImage] = React.useState("");

  React.useEffect(() => {
    const rankRef = collection(db, "rankDescription").withConverter(
      rankDescriptionConverter,
    );
    const q = query(rankRef, orderBy("createdAt", "asc"));

    const unsubRank = onSnapshot(q, (snapshot) => {
      const ranks: RankDescription[] = [];

      for (const doc of snapshot.docs) {
        ranks.push({ ...doc.data(), id: doc.id });
      }

      if (ranks.length >= 1) {
        for (const rank of ranks) {
          if (user.points >= rank.points) {
            setRankImage(rank.image);
          }
        }
      }
    });

    return () => unsubRank();
  }, [user]);

  return (
    <nav className="bg-background sticky top-0 z-50 flex w-full shrink-0 items-stretch justify-center shadow">
      <div className="container flex h-16 w-full items-center justify-between gap-2 p-4">
        <Image
          className="w-14"
          src="/logo.webp"
          alt="logo"
          height={80}
          width={80}
          priority
        />

        <div className="flex w-fit shrink-0 items-center gap-2">
          <Button
            className={cn(
              "hidden cursor-pointer",
              user.role === "campaignManager" &&
                user.status === "approved" &&
                "md:flex",
            )}
            onClick={() => setOpenCreateCampaign(true)}
          >
            <PlusCircle /> Create new campaign
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="text-muted-foreground cursor-pointer"
                variant="ghost"
              >
                <Avatar>
                  <AvatarImage src={user.profilepictureURL} />
                  <AvatarFallback>
                    <Skeleton className="size-full" />
                  </AvatarFallback>
                </Avatar>
                {rankImage.length >= 1 && (
                  <img
                    className="size-4"
                    src={rankImage ?? ""}
                    alt="frame tier"
                  />
                )}
                <p className="text-xs">{formatCompactNumber(user.points)}pts</p>
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div>
                  <p className="leading-none">{user.displayName}</p>
                  <small className="text-muted-foreground text-xs">
                    {user.email}
                  </small>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={cn(
                  "hidden",
                  user.status === "approved" && "flex md:hidden",
                )}
                onClick={() => setOpenCreateCampaign(true)}
              >
                <PlusCircle /> Create New Campaign
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/profile/${user.uid}`}>
                  <User2Icon /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpen(true)}>
                <BadgeInfo /> Rank Description
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenScoreLog(true)}>
                <HistoryIcon /> Scoring History Log
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut(auth)}>
                <LogOutIcon /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <RankDescriptionDialog open={open} onOpenChange={setOpen} />
    </nav>
  );
}
