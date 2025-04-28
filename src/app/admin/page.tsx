"use client";
import * as React from "react";

import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
// import { type ChartConfig } from "@/components/ui/chart";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { auth, db } from "@/config/firebase";
import { rankDescriptionConverter, userConverter } from "@/lib/utils";
import type { RankDescription, User } from "@/types";

// const chartConfig = {
//   total: { color: "hsl(var(--primary))" },
// } satisfies ChartConfig;

export default function Home() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [ranks, setRanks] = React.useState<RankDescription[]>([]);
  // const [totalFramesData, setTotalFramesData] = React.useState<
  //   { total: number; frame: FrameTier }[]
  // >([]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const userRef = collection(db, "users").withConverter(userConverter);

      onSnapshot(userRef, (snapshot) => {
        const users: User[] = [];

        snapshot.forEach((doc) => {
          const user = doc.data();

          users.push({ ...user, uid: doc.id });
        });

        setUsers(users);
      });
    });

    const rankRef = collection(db, "rankDescription").withConverter(
      rankDescriptionConverter,
    );
    const q = query(rankRef, orderBy("createdAt", "desc"));
    const unsubRank = onSnapshot(q, (snapshot) => {
      const ranks: RankDescription[] = [];

      for (const doc of snapshot.docs) {
        ranks.push({ ...doc.data(), id: doc.id });
      }

      setRanks(ranks);
    });

    return () => {
      unsub();
      unsubRank();
    };
  }, []);

  // React.useEffect(() => {
  //   if (users.length < 1) return;
  //   const totalFramesData: { total: number; frame: FrameTier }[] = [
  //     { total: 0, frame: "bronze" },
  //     { total: 0, frame: "silver" },
  //     { total: 0, frame: "gold" },
  //     { total: 0, frame: "platinum" },
  //     { total: 0, frame: "diamond" },
  //   ];

  //   for (const user of users) {
  //     switch (user.frameTier) {
  //       case "bronze":
  //         totalFramesData[0]!.total! += 1;
  //         break;
  //       case "silver":
  //         totalFramesData[1]!.total! += 1;
  //         break;
  //       case "gold":
  //         totalFramesData[2]!.total! += 1;
  //         break;
  //       case "platinum":
  //         totalFramesData[3]!.total! += 1;
  //         break;
  //       case "diamond":
  //         totalFramesData[4]!.total! += 1;
  //         break;
  //       default:
  //         throw new Error("Invalid frame type");
  //     }
  //   }

  //   setTotalFramesData(totalFramesData);
  // }, [users]);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <h4 className="text-lg font-semibold">Users</h4>
        </div>
      </header>

      {/* <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution by Frame Tier</CardTitle>
            <CardDescription>
              This chart shows the total number of users per frame tier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart accessibilityLayer data={totalFramesData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="frame"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="total" fill="var(--color-total)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div> */}

      <div className="flex flex-col gap-4 p-6">
        {users.map((user) => (
          <Card key={user.uid}>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="size-16">
                  <AvatarImage
                    src={user.profilepictureURL}
                    alt={user.displayName}
                  />
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{user.displayName}</CardTitle>
                    {ranks.length > 0 && (
                      <img
                        className="size-6"
                        src={
                          ranks.reduce(
                            (acc: string | null, rank) =>
                              rank.name === user.frameTier ? rank.image : acc,
                            null,
                          ) ?? "/badges/BRONZE.png"
                        }
                        alt={user.displayName}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <CardDescription>{user.email}</CardDescription>
                    <Badge>{user.role}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <BlockUserDialog user={user} />
                <DeleteUserDialog user={user} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

interface DeleteUserDialogProps {
  user: User;
}

function DeleteUserDialog({ user }: DeleteUserDialogProps) {
  const handleOnDeleteUser = async () => {
    const userRef = doc(db, "users", user.uid);

    await deleteDoc(userRef);

    toast.success("User deleted successfully!");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete user</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete the user with ID {user.uid}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleOnDeleteUser()}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface BlockUserDialogProps {
  user: User;
}

function BlockUserDialog({ user }: BlockUserDialogProps) {
  // Function to handle blocking a user
  const handleOnBlockUser = async () => {
    const userRef = doc(db, "users", user.uid);

    if (user.blocked) {
      await updateDoc(userRef, { blocked: false }).finally(() => {
        toast.success("User unblocked successfully!");
      });

      return;
    }

    await updateDoc(userRef, { blocked: true }).finally(() => {
      toast.success("User blocked successfully!");
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>{user?.blocked ? "Unblock" : "Block"}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will {user.blocked ? "unblock" : "block"} the user with ID{" "}
            {user?.uid}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleOnBlockUser()}>
            {user?.blocked ? "Unblock" : "Block"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
