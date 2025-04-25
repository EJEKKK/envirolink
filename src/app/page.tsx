"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { auth, db } from "@/config/firebase";
import { useIsClient } from "@/hooks/use-is-client";
import {
  campaignConverter,
  cn,
  commentConverter,
  formatCompactNumber,
  likeConverter,
  userConverter,
} from "@/lib/utils";
import type { Campaign, Comment } from "@/types";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, intlFormatDistance, sub } from "date-fns";
import { type User, onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { Loader, ShieldPlusIcon, UserRoundPlusIcon } from "lucide-react";
import { useSignInWithFacebook } from "react-firebase-hooks/auth";
import { toast } from "sonner";

/**
 * Fetches user data from Firestore.
 * @param {string} uid - The user ID.
 * @returns {Promise<Object|null>} - The user data or null if not found.
 */
const fetchUserData = async (uid: string) => {
  const userRef = doc(db, "users", uid).withConverter(userConverter);
  const res = await getDoc(userRef);
  return res.exists() ? res.data() : null;
};

/**
 * Ensures the user document exists in Firestore and creates it if it doesn't.
 * @param {Object} user - The user object.
 * @returns {Promise<Object>} - The user data.
 */
const ensureUserDocument = async (user: User) => {
  const userDocRef = doc(db, "users", user.uid).withConverter(userConverter);
  let userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    await setDoc(userDocRef, {
      displayName: user.displayName || "",
      email: user.email || "",
      facebookID: user.providerData[0]?.uid || "",
      profilepictureURL: user.photoURL || "",
      role: "user",
      points: 0,
      frameTier: "bronze",
      createdAt: serverTimestamp(),
      status: "pending",
      blocked: false,
      uid: user.uid,
    });
    userDoc = await getDoc(userDocRef);
  }

  return userDoc.data();
};

export default function HomePage() {
  const router = useRouter();

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const isClient = useIsClient();

  // const [, isAuthLoading] = useAuthState(auth, {
  //   onUserChanged: async (user) => {
  //     if (user) {
  //       try {
  //         const userData = await fetchUserData(user.uid);
  //         if (!userData) return;

  //         if (userData.blocked) {
  //           toast.error("Your account has been blocked.");
  //           signOut(auth);
  //           return;
  //         }

  //         switch (userData.role) {
  //           case "admin":
  //             navigate("/admin");
  //             break;
  //           case "volunteer":
  //             navigate("/volunteerDashboard");
  //             break;
  //           case "campaignManager":
  //             navigate("/campaignManagerDashboard");
  //             break;
  //           default:
  //             navigate("/user");
  //         }
  //       } catch (error) {
  //         console.error("Error fetching user document:", error);
  //       }
  //     }
  //   },
  // });

  const [signInWithFacebook, , loading] = useSignInWithFacebook(auth);

  const handleOnSignInWithPopup = async () => {
    try {
      // Attempt to sign in with Facebook using a popup
      const res = await signInWithFacebook(["email", "public_profile"], {
        auth_type: "reauthenticate",
        display: "popup",
      });

      // Get the user from the response
      const user = res?.user;
      if (!user) {
        toast.error("User not found");
        return;
      }

      // Check if the user's email is available
      if (!user.email) {
        toast.error(
          "Facebook login failed: Missing email permission. Please grant email access.",
        );
        return;
      }

      // Ensure the user document exists in Firestore
      const userData = await ensureUserDocument(user);

      // Navigate based on the user's role
      switch (userData?.role) {
        case "admin":
          router.push("/admin");
          break;
        case "volunteer":
          router.push("/volunteer-dashboard");
          break;
        case "campaignManager":
          router.push("/campaign-manager-dashboard");
          break;
        default:
          router.push("/user-role");
      }
    } catch {
      toast.error("Error", {
        description: "Error signing in with Facebook",
      });
    }
  };

  // Effect to handle authentication state changes
  React.useEffect(() => {
    if (!isClient) return;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userData = await fetchUserData(user.uid);
        if (!userData) return;

        if (userData.blocked) {
          toast.error("Your account has been blocked.");
          signOut(auth);
          return;
        }

        switch (userData.role) {
          case "admin":
            router.push("/admin");
            break;
          case "volunteer":
            router.push("/volunteer-dashboard");
            break;
          case "campaignManager":
            router.push("/campaign-manager-dashboard");
            break;
          default:
            router.push("/user-role");
        }
      } catch (error) {
        console.error("Error fetching user document:", error);
      }
    });

    return () => unsub();
  }, [isClient, router.push]);

  // Effect to handle real-time updates to campaigns collection
  React.useEffect(() => {
    if (!isClient) return;

    const campaignQuery = query(
      collection(db, "campaigns").withConverter(campaignConverter),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
    );
    const unsubCampaign = onSnapshot(campaignQuery, (snapshot) => {
      const newCampaigns: Campaign[] = [];

      snapshot.forEach((doc) => {
        newCampaigns.push({
          ...doc.data(),
          id: doc.id,
        });
      });
      setCampaigns(newCampaigns);
    });

    return () => {
      unsubCampaign();
    };
  }, [isClient]);

  React.useEffect(() => {
    if (!isClient) return;

    if (campaigns.length < 1) return;

    const fetchLikes = async () => {
      const newCampaigns: Campaign[] = [];

      for (const campaign of campaigns) {
        const likeRef = collection(
          db,
          "campaigns",
          campaign.id,
          "likes",
        ).withConverter(likeConverter);
        const likeSnapshot = await getDocs(likeRef);
        const likes = likeSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        newCampaigns.push({ ...campaign, likes });
      }

      setCampaigns(newCampaigns);
    };

    void fetchLikes();
  }, [campaigns, isClient]);

  return (
    <main className="flex min-h-dvh w-full flex-col gap-6 bg-[url('/background.jpg')] bg-fixed bg-center bg-no-repeat">
      <section className="flex min-h-[30rem] w-full flex-col items-center justify-center gap-4 md:flex-row md:items-stretch">
        <div className="flex min-h-full w-full flex-col items-center justify-center gap-4 p-8 backdrop-blur-md">
          <h2 className="text-secondary text-center text-3xl font-bold md:text-start">
            Welcome to <span className="text-primary">ENVIROLINK!</span>
          </h2>
          <p className="text-muted w-full max-w-md text-center">
            Take action, support environmental campaigns, and make a real impact
            in your community. Be part of the movement for a greener future.
          </p>
          <div className="grid w-full max-w-lg grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="bg-primary/10 flex flex-col gap-2 rounded-md p-4">
              <div className="text-primary flex items-center gap-2">
                <UserRoundPlusIcon className="size-5" />{" "}
                <span>Earn Points</span>
              </div>
              <p className="text-muted text-sm">
                Participate in various activities and earn points to unlock
                rewards and recognition.
              </p>
            </div>
            <div className="bg-primary/10 flex flex-col gap-2 rounded-md p-4">
              <div className="text-primary flex items-center gap-2">
                <ShieldPlusIcon className="size-5" /> <span>Rank Up</span>
              </div>
              <p className="text-muted text-sm">
                Level up your profile by participating in campaigns and
                completing tasks. Earn badges and move up the ranks!
              </p>
            </div>
          </div>
        </div>
        <div className="flex w-full grow items-center justify-center p-6 md:min-h-full">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-col items-center text-center">
              <div className="relative min-w-64 shrink-0">
                <AspectRatio ratio={16 / 9}>
                  <img
                    className="size-full object-cover"
                    src="/logo.png"
                    alt="logo"
                  />
                </AspectRatio>
              </div>
              <CardDescription className="text-xl">
                Connect with friends and the world around you
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                className="grow cursor-pointer"
                size="lg"
                onClick={handleOnSignInWithPopup}
                disabled={loading}
              >
                {loading ? (
                  <Loader className="animate-spin" />
                ) : (
                  <svg
                    className="size-6"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="white"
                  >
                    <path d="M9.464 1.286C10.294.803 11.092.5 12 .5c.908 0 1.707.303 2.537.786.795.462 1.7 1.142 2.815 1.977l2.232 1.675c1.391 1.042 2.359 1.766 2.888 2.826.53 1.059.53 2.268.528 4.006v4.3c0 1.355 0 2.471-.119 3.355-.124.928-.396 1.747-1.052 2.403-.657.657-1.476.928-2.404 1.053-.884.119-2 .119-3.354.119H7.93c-1.354 0-2.471 0-3.355-.119-.928-.125-1.747-.396-2.403-1.053-.656-.656-.928-1.475-1.053-2.403C1 18.541 1 17.425 1 16.07v-4.3c0-1.738-.002-2.947.528-4.006.53-1.06 1.497-1.784 2.888-2.826L6.65 3.263c1.114-.835 2.02-1.515 2.815-1.977zM10.5 13A1.5 1.5 0 0 0 9 14.5V21h6v-6.5a1.5 1.5 0 0 0-1.5-1.5h-3z"></path>
                  </svg>
                )}
                Login with Facebook
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
      <section className="w-full p-6">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="on-going">On Going</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>
          <TabsContent value="new">
            <ScrollArea>
              <div className="flex items-center gap-2">
                {campaigns
                  .filter(
                    (campaign) =>
                      !campaign.isDone &&
                      new Date() <= campaign.description.when.toDate(),
                  )
                  .map((campaign) => (
                    <CampaignList key={campaign.id} campaign={campaign} />
                  ))}
              </div>

              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="on-going">
            <ScrollArea>
              <div className="flex items-center gap-2">
                {campaigns
                  .filter(
                    (campaign) =>
                      !campaign.isDone &&
                      campaign.description.when.toDate() <= new Date(),
                  )
                  .map((campaign) => (
                    <CampaignList key={campaign.id} campaign={campaign} />
                  ))}
              </div>

              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="done">
            <ScrollArea>
              <div className="flex items-center gap-2">
                {campaigns
                  .filter((campaign) => campaign.isDone)
                  .map((campaign) => (
                    <CampaignList key={campaign.id} campaign={campaign} />
                  ))}
              </div>

              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

interface CampaignListProps {
  campaign: Campaign;
}

function CampaignList({ campaign }: CampaignListProps) {
  const [isLightBoxOpen, setIsLightBoxOpen] = React.useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = React.useState(false);
  React.useState(false);
  const [current, setCurrent] = React.useState(0);

  function handleOnImageClick(index: number) {
    setIsLightBoxOpen(true);
    setCurrent(index);
  }

  // Function to get the count of likes for a campaign
  function getLikesCount() {
    return campaign.likes?.filter((like) => like.type === "like").length ?? 0;
  }

  return (
    <Card className="w-full max-w-md shrink-0">
      <CardHeader>
        <CardTitle className="flex items-center justify-between font-bold">
          {campaign.title}
        </CardTitle>
        <Separator className="my-2" />
        <CardDescription className="grid gap-4 sm:grid-cols-2">
          <div>
            <p>What:</p>
            <p className="text-primary font-semibold">
              {campaign.description.what}
            </p>
          </div>

          <div>
            <p>When:</p>
            <p className="text-primary font-semibold">
              {format(
                campaign.description.when.toDate(),
                "MMM dd, yyyy 'at' hh:mm aaaa",
              )}
            </p>
          </div>

          <div>
            <p>Where:</p>
            <p className="text-primary font-semibold">
              {campaign.description.where}
            </p>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {campaign.photoURLs.length >= 1 ? (
          <div className="grid h-40 grid-cols-2 gap-2 overflow-hidden rounded-md">
            {campaign.photoURLs.slice(0, 2).map((photo, index) => (
              <div
                className={cn(
                  "bg-accent relative col-span-2 flex h-full cursor-pointer items-center justify-center overflow-hidden",
                  campaign.photoURLs.length > 2 &&
                    index === 1 &&
                    "col-start-1 col-end-2",
                )}
                key={index}
                onClick={() => handleOnImageClick(index)}
              >
                <AspectRatio ratio={16 / 9}>
                  <img
                    className="size-full object-cover object-center"
                    src={photo}
                    alt="campaign image"
                  />
                </AspectRatio>
              </div>
            ))}

            {campaign.photoURLs.length >= 3 ? (
              <div
                className="bg-accent relative col-start-2 col-end-3 flex h-full cursor-pointer items-center justify-center overflow-hidden"
                onClick={() => handleOnImageClick(0)}
              >
                <p className="text-primary text-4xl font-bold">
                  {campaign.photoURLs.length - 2}+
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <CampaignLightBoxDialog
          open={isLightBoxOpen}
          onOpenChange={setIsLightBoxOpen}
          photoURLs={campaign.photoURLs}
          activeIndex={current}
        />

        <CommentsDialog
          campaignId={campaign.id}
          open={isCommentDialogOpen}
          onOpenChange={setIsCommentDialogOpen}
        />

        <p className="text-muted-foreground my-4 text-sm">
          Likes: {formatCompactNumber(getLikesCount())}
        </p>
      </CardContent>
    </Card>
  );
}

interface CampaignLightBoxDialogProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  activeIndex: number;
  photoURLs: string[];
}

function CampaignLightBoxDialog({
  open,
  onOpenChange,
  activeIndex = 0,
  photoURLs,
}: CampaignLightBoxDialogProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  function handleOnIndicatorClick(index: number) {
    if (!api) return;

    api.scrollTo(index);
  }

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(activeIndex + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Campaign Images</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="relative flex w-full flex-col items-center gap-4">
          <Carousel
            className="w-10/12"
            setApi={setApi}
            opts={{ startIndex: activeIndex, loop: true }}
          >
            <CarouselContent>
              {photoURLs.map((photo, index) => (
                <CarouselItem key={index}>
                  <Card>
                    <CardContent>
                      <div className="relative overflow-hidden">
                        <AspectRatio ratio={16 / 9}>
                          <img
                            className="size-full object-cover object-center"
                            src={photo}
                            alt="campaign image"
                          />
                        </AspectRatio>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext />
            <CarouselPrevious />
          </Carousel>

          {/* Carousel Indicator */}
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: count })
              .fill(0)
              .map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "bg-primary size-2 rounded-full duration-150",
                    current === index + 1 && "w-4",
                  )}
                  onClick={() => handleOnIndicatorClick(index)}
                />
              ))}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CommentsDialogProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  campaignId: string;
}

function CommentsDialog({
  open,
  onOpenChange,
  campaignId,
}: CommentsDialogProps) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [isFetching, setIsFetching] = React.useState(false);

  // Effect to handle real-time updates to comments collection
  React.useEffect(() => {
    setIsFetching(true);
    const commentsCollection = collection(db, "comments").withConverter(
      commentConverter,
    );

    const commentsQuery = query(
      commentsCollection,
      orderBy("timestamp", "desc"),
      where("campaignRef", "==", doc(db, "campaigns", campaignId)),
    );

    const unsub = onSnapshot(commentsQuery, (snapshot) => {
      const comments: Comment[] = [];

      snapshot.forEach((doc) => {
        const comment = doc.data();

        comments.push({ ...comment, id: doc.id });
      });

      setComments(comments);
      setIsFetching(false);
    });

    return () => unsub();
  }, []);

  if (isFetching) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {comments.length >= 1 ? (
              comments.map((comment) => (
                <Card key={comment.id} className="w-full p-0">
                  <CardContent className="p-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold">
                          {comment.displayName}
                        </p>
                        <p className="text-primary text-xs font-semibold">
                          {intlFormatDistance(
                            comment.timestamp?.toDate() ?? new Date(),
                            new Date(),
                            { style: "narrow" },
                          )}
                        </p>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {comment.comment}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex min-h-full items-center justify-center">
                <p className="text-muted-foreground text font-bold">
                  No comments yet
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
