"use client"
import * as React from "react";

import emailjs from "@emailjs/browser";
import { getYear } from "date-fns";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { UserIcon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { db } from "@/config/firebase";
import { cn, userConverter } from "@/lib/utils";
import type { User } from "@/types";

export default function PendingAccounts() {
  const [users, setUsers] = React.useState<User[]>([]);

  // Update the user status to "approved"
  const handleAccept = async (userId: string) => {
    const userRef = doc(db, "users", userId).withConverter(userConverter);
    const userEmail = users.find((user) => user.uid === userId)?.email!;

    await updateDoc(userRef, { status: "approved" })
      .finally(async () => {
        toast.success("User account approved");

        // Send email notification to the user
        await emailjs
          .send(
            "service_r40lz39",
            "template_0yp80ke",
            {
              user_email: userEmail,
              year: getYear(new Date()),
            },
            { publicKey: "VjMyyNHAC_ziEuT-P" },
          )
          .then(() => {
            toast.success("Email notification successfully sent");
          })
          .catch((err) => console.log(err));
      })
      .catch(() => {
        toast.error("Failed to approve user account");
      });
  };

  // Update the user status to "rejected"
  const handleReject = async (userId: string) => {
    const userRef = doc(db, "users", userId).withConverter(userConverter);

    await updateDoc(userRef, { status: "rejected" })
      .finally(() => {
        toast.success("User account rejected");
      })
      .catch(() => {
        toast.error("Failed to reject user account");
      });
  };

  React.useEffect(() => {
    const userRef = collection(db, "users").withConverter(userConverter);
    const userQuery = query(userRef, where("status", "==", "pending"));

    const unsub = onSnapshot(userQuery, (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        ...doc.data(),
        uid: doc.id,
      }));
      setUsers(users);
    });

    return () => unsub();
  }, []);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <h4 className="text-lg font-semibold">Pending Accounts</h4>
        </div>
      </header>

      {users.length > 0 ? (
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
                    <AvatarFallback>
                      <UserIcon />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <CardTitle>{user.displayName}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                    <Badge
                      className={cn(
                        user.status === "pending" &&
                          "bg-yellow-200 text-yellow-600",
                      )}
                    >
                      {user.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => void handleAccept(user.uid)}>
                    Accept
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void handleReject(user.uid)}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-6">
          <h4 className="text-muted-foreground text-lg font-semibold">
            No pending accounts
          </h4>
        </div>
      )}
    </>
  );
}