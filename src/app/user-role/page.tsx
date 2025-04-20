"use client";
import { useRouter } from "next/navigation";
import * as React from "react";

import { type User, onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth, db } from "@/config/firebase";

export default function UserPage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const router = useRouter();

  // Function to handle the click event for the Volunteer button
  const handleOnVolunteerClicked = async () => {
    setIsUpdating(true); // Set the updating state to true

    if (user) {
      const userRef = doc(db, "users", user.uid); // Get the user reference
      await updateDoc(userRef, {
        role: "volunteer",
        status: "approved",
      }).then(() => {
        toast.message("You are now a Volunteer"); // Show a toast message
        router.replace("/volunteer-dashboard"); // Navigate to the home page
      });
    }
  };

  const handleOnCapmaignClicked = async () => {
    setIsUpdating(true);

    if (user) {
      const userRef = doc(db, "users", user.uid); // Get the user reference
      await updateDoc(userRef, {
        role: "campaignManager",
        status: "pending",
      }).then(() => {
        toast.message("You are now a Campaign Manager"); // Show a toast message
        router.replace("/campaign-manager-dashboard"); // Navigate to the home page
      });
    }
  };

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
        return;
      }

      setUser(user);
    });

    return () => unsub();
  }, [router.push]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-primary text-4xl">
            Welcome to EnviroLink, <br />
            <span className="text-primary">User {user?.displayName}</span>
          </CardTitle>
          <CardDescription className="text-xl">
            Select Your Role
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center gap-4">
          <Button
            className="w-full shrink cursor-pointer"
            size="lg"
            onClick={handleOnVolunteerClicked}
            disabled={isUpdating}
          >
            {isUpdating ? <Loader className="animate-spin" /> : "Volunteer"}
          </Button>
          <Button
            className="w-full shrink cursor-pointer"
            size="lg"
            onClick={handleOnCapmaignClicked}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader className="animate-spin" />
            ) : (
              "Campaign Manager"
            )}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
