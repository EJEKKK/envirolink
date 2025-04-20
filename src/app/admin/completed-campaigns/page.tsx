"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { format, intlFormatDistance, isAfter, isBefore } from "date-fns";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { Loader2Icon, MessageCircleIcon, SendIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import DateRangePicker from "@/components/date-range-picker";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from "@/config/firebase";
import { getFrame } from "@/helper";
import {
  campaignConverter,
  cn,
  commentConverter,
  formatCompactNumber,
  likeConverter,
  participationConverter,
  pointsConverter,
  userConverter,
} from "@/lib/utils";
import type { Campaign, Comment, Participation, Points, User } from "@/types";
import VolunteerAttendanceDialog from "./_components/volunteer-attendance-dialog";

import type { DateRange } from "react-day-picker";

export default function CompletedCampaigns() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [participations, setParticipations] = React.useState<Participation[]>(
    [],
  );
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [isFetching, setIsFetching] = React.useState(false);

  // Effect to handle authentication state changes
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }

      const userRef = doc(db, "users", user?.uid as string).withConverter(
        userConverter,
      );
      onSnapshot(userRef, (doc) => {
        if (doc.data()?.blocked) {
          toast.error("Your account has been blocked.");
          void signOut(auth);
        }

        const userData = doc.data();
        setUser({ ...userData, uid: doc.id } as User);
      });
    });

    return () => unsub();
  }, [router.push]);

  // Effect to handle real-time updates to campaigns collection
  React.useEffect(() => {
    if (!user) return;

    setIsFetching(true);

    const getLikes = async (docId: string) => {
      const likeRef = collection(db, "campaigns", docId, "likes").withConverter(
        likeConverter,
      );
      const likeSnapshot = await getDocs(likeRef);
      const likes = likeSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      return likes;
    };

    const getPoints = async (docId: string) => {
      const pointsRef = collection(
        db,
        "campaigns",
        docId,
        "points",
      ).withConverter(pointsConverter);

      const pointsSnapshot = await getDocs(pointsRef);
      const points = pointsSnapshot.docs[0]?.data() as Points;

      return points;
    };

    const campaignQuery = query(
      collection(db, "campaigns").withConverter(campaignConverter),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
    );
    const unsubCampaign = onSnapshot(campaignQuery, async (snapshot) => {
      setIsFetching(true);
      const newCampaigns: Campaign[] = [];

      for (const doc of snapshot.docs) {
        const likes = await getLikes(doc.id);
        const points = (await getPoints(doc.id)) as Points;

        newCampaigns.push({ ...doc.data(), likes, points, id: doc.id });
      }

      if (date?.from && date?.to) {
        const filteredByWhenCampaigns = newCampaigns.filter(
          (campaign) =>
            isBefore(date.from as Date, campaign.description.when.toDate()) &&
            isAfter(date.to as Date, campaign.description.when.toDate()),
        );

        setCampaigns(filteredByWhenCampaigns);
        setIsFetching(false);
      } else {
        setCampaigns(newCampaigns);
        setIsFetching(false);
      }
    });

    const participationQuery = query(
      collection(db, "participation").withConverter(participationConverter),
      where("uid", "==", user?.uid),
      where("status", "==", "joined"),
    );

    const unsubParticipation = onSnapshot(participationQuery, (snapshot) => {
      const newParticipations: Participation[] = [];

      for (const doc of snapshot.docs) {
        const participation = doc.data();

        newParticipations.push({ ...participation, id: doc.id });
      }

      setParticipations(newParticipations);
    });

    return () => {
      unsubCampaign();
      unsubParticipation();
    };
  }, [user, date]);

  if (!user) return null;

  return (
    <main className="flex flex-col gap-4 p-4">
      <header className="flex h-16 shrink-0 items-center justify-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="container flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <h4 className="text-lg font-semibold">Completed Campaigns</h4>
        </div>
      </header>

      {/* Campaign List */}
      <section className="flex w-full flex-col items-center gap-4">
        {/* Toolbar */}
        <div className="container flex w-full flex-wrap items-center gap-2">
          <div className="flex w-full flex-col items-center gap-2 md:w-fit md:flex-row">
            <DateRangePicker
              triggerClassName="w-full md:w-fit"
              date={date}
              onValueChanged={setDate}
              placeholder="Filter by when"
            />
            {date?.from && date?.to && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDate(undefined)}
              >
                <XIcon /> Clear date filters
              </Button>
            )}
          </div>
        </div>

        <div className="container grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Campaign List */}
          {isFetching ? (
            <div className="flex items-center justify-center md:col-span-2 lg:col-span-3">
              <Loader2Icon className="text-primary animate-spin" />
            </div>
          ) : campaigns.length >= 1 ? (
            campaigns
              .filter((campaign) => !campaign.isScoreApplied)
              .map((campaign) => (
                <CampaignList
                  key={campaign.id}
                  campaign={campaign}
                  participations={participations}
                />
              ))
          ) : (
            <div className="text-center md:col-span-2 lg:col-span-3">
              <h4 className="text-muted-foreground text-lg font-bold">
                No campaigns to show
              </h4>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

interface CampaignListProps {
  campaign: Campaign;
  participations: Participation[];
}

function CampaignList({ campaign, participations }: CampaignListProps) {
  const [isLightBoxOpen, setIsLightBoxOpen] = React.useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = React.useState(false);
  const [current, setCurrent] = React.useState(0);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [shareCount, setShareCount] = React.useState(0);

  function handleOnImageClick(index: number) {
    setIsLightBoxOpen(true);
    setCurrent(index);
  }

  // // Function to handle joining a campaign
  // const handleOnJoinCampaign = async (campaignId: string) => {
  //   const user = auth.currentUser;

  //   if (user) {
  //     try {
  //       const optionsRef = collection(
  //         db,
  //         "campaigns",
  //         campaignId,
  //         "points",
  //       ).withConverter(pointsConverter);
  //       const campaignOptions = (
  //         await getDocs(optionsRef)
  //       ).docs[0]!.data() as Points;

  //       const displayName = user.displayName || "Anonymous";
  //       const uid = user.uid;

  //       // Add a new participation record
  //       await addDoc(collection(db, "participation"), {
  //         campaignid: campaignId,
  //         uid,
  //         displayName,
  //         joindate: serverTimestamp(),
  //         status: "joined",
  //       });

  //       // Award points based on campaign join points
  //       const userRef = doc(db, "users", uid);
  //       await updateDoc(userRef, { points: increment(campaignOptions.join) });
  //       await updateFrameTier(userRef);
  //       setType("promote");

  //       toast.success(
  //         `Successfully joined the campaign and earned ${campaignOptions.join} points!`,
  //       );
  //     } catch (error) {
  //       toast.error("Error joining campaign. Please try again.");
  //     }
  //   } else {
  //     toast.error("You must be logged in to join a campaign.");
  //   }
  // };

  // // Function to handle leaving a campaign
  // const handleOnLeaveCampaign = async (campaignId: string) => {
  //   const user = auth.currentUser;

  //   try {
  //     if (user) {
  //       const participationId = participations.find(
  //         (participation) => participation.campaignid === campaignId,
  //       )!.id;

  //       const uid = user!.uid;

  //       // Remove the participation record from Firestore
  //       await deleteDoc(doc(db, "participation", participationId)).catch(() => {
  //         toast.error("Error leaving campaign. Please try again.");
  //       });

  //       const userRef = doc(db, "users", uid).withConverter(userConverter);
  //       await updateDoc(userRef, { points: increment(-10) }).finally(() => {
  //         toast.success(`You left the campaign and lost 10 points!`);
  //       });
  //       await updateFrameTier(userRef);
  //       setType("demote");
  //     }
  //   } catch (error) {
  //     toast.error("Error leaving campaign. Please try again.");
  //   }
  // };

  // Function to get the count of likes for a campaign
  function getLikesCount() {
    return campaign.likes?.filter((like) => like.type === "like").length ?? 0;
  }

  // Effect to listen for changes in campaign comments and update state
  React.useEffect(() => {
    const campaignRef = doc(db, "campaigns", campaign.id);
    const commentsRef = collection(db, "comments").withConverter(
      commentConverter,
    );
    const commentsQuery = query(
      commentsRef,
      where("campaignRef", "==", campaignRef),
      orderBy("timestamp", "desc"),
    );
    const unsub = onSnapshot(commentsQuery, async (snapshot) => {
      const comments = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setComments(comments);
    });

    return () => unsub();
  }, [campaign.id]);

  // Effect to listen for changes in campaign shares and update state
  React.useEffect(() => {
    const participationRef = collection(db, "participation").withConverter(
      participationConverter,
    );
    const shareCountQuery = query(
      participationRef,
      where("campaignid", "==", campaign.id),
      where("status", "==", "shared"),
    );
    const unsub = onSnapshot(shareCountQuery, (snapshot) => {
      setShareCount(snapshot.size);
    });

    return () => unsub();
  }, [campaign.id]);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between font-bold">
            <div className="flex items-center gap-2">
              <Link href={`/profile/${campaign.managerUid}`}>
                <Avatar>
                  <AvatarImage src={campaign.managerPhotoURL} />
                  <AvatarFallback>
                    {campaign.managerDisplayName.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <p className="text-sm font-semibold">
                  {campaign.managerDisplayName ?? "Anonymous"}
                </p>
                <p className="text-sm">{campaign.title}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {!campaign.isScoreApplied ? (
                <VolunteerAttendanceDialog
                  participations={participations.filter(
                    (participation) =>
                      participation.isPresent &&
                      participation.campaignid === campaign.id,
                  )}
                />
              ) : null}
            </div>
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
          <Separator />
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <p>Like</p>
              <p className="text-primary font-semibold">
                {campaign.points?.like} pts
              </p>
            </div>

            <div>
              <p>Comment</p>
              <p className="text-primary font-semibold">
                {campaign.points?.comment} pts
              </p>
            </div>

            <div>
              <p>Join</p>
              <p className="text-primary font-semibold">
                {campaign.points?.join} pts
              </p>
            </div>

            <div>
              <p>Share</p>
              <p className="text-primary font-semibold">
                {campaign.points?.share} pts
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {campaign.photoURLs.length >= 1 ? (
            <div className="grid h-96 grid-cols-2 gap-2 overflow-hidden rounded-md">
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

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground my-4 text-sm">
              Likes: {formatCompactNumber(getLikesCount())}
            </p>
            <p className="text-muted-foreground my-4 text-sm">
              Comments: {formatCompactNumber(comments.length)}
            </p>
            <p className="text-muted-foreground my-4 text-sm">
              Shares: {formatCompactNumber(shareCount)}
            </p>
          </div>
          <Separator />
        </CardContent>
        <CardFooter className="flex-col gap-2 sm:flex-row">
          <Button
            className="w-full grow cursor-pointer sm:w-auto"
            variant="ghost"
            onClick={() => setIsCommentDialogOpen(true)}
          >
            <MessageCircleIcon /> Comment
          </Button>
        </CardFooter>
      </Card>
      {comments.length >= 1
        ? comments.slice(0, 3).map((comment) => (
            <Card key={comment.id} className="w-full p-0">
              <CardContent className="p-2">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${comment.uid}`}>
                        <Avatar>
                          <AvatarImage src={comment.userPhotoURL ?? ""} />
                          <AvatarFallback>
                            {comment.displayName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold">
                          {comment.displayName}
                        </p>
                        <img
                          className="size-4"
                          src={getFrame(comment.frameTier)}
                          alt={comment.displayName}
                        />
                      </div>
                    </div>
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
        : null}
    </div>
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
  }, [api, activeIndex]);

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
  const [isSending, setIsSending] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [type, setType] = React.useState<"promote" | "demote">("promote");
  const handleOnSendComment = async () => {
    setIsSending(true);
    const user = auth.currentUser;
    const pointsRef = collection(
      db,
      "campaigns",
      campaignId,
      "points",
    ).withConverter(pointsConverter);
    const campaignOptions = (
      await getDocs(pointsRef)
    ).docs[0]!.data() as Points;

    const frameTier = await getDoc(
      doc(db, "users", user?.uid ?? "").withConverter(userConverter),
    ).then((doc) => doc.data()!.frameTier);

    if (user) {
      try {
        const campaignRef = doc(db, "campaigns", campaignId);

        const commentData = {
          comment,
          displayName: user.displayName || "Anonymous",
          timestamp: serverTimestamp(),
          uid: user.uid,
          campaignRef: campaignRef,
          userPhotoURL: user.photoURL,
          frameTier,
        };

        // Add the comment to the 'comments' collection
        await addDoc(collection(db, "comments"), commentData);

        // Award points based on campaign comment points
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          points: increment(campaignOptions.comment),
        });
        setType("promote");

        toast.success(
          `Comment added successfully and earned ${campaignOptions.comment} points!`,
        );
        setIsSending(false);
        setComment("");
      } catch (error) {
        toast.error("Error adding comment. Please try again.");
        setIsSending(false);
        setComment("");
      }
    } else {
      toast.error("You must be logged in to add a comment.");
      setIsSending(false);
    }
  };

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
  }, [campaignId]);

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
                        <div className="flex items-center gap-2">
                          <Link href={`/profile/${comment.uid}`}>
                            <Avatar>
                              <AvatarImage src={comment.userPhotoURL ?? ""} />
                              <AvatarFallback>
                                {comment.displayName.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold">
                              {comment.displayName}
                            </p>
                            <img
                              className="size-4"
                              src={getFrame(comment.frameTier)}
                              alt={comment.displayName}
                            />
                          </div>
                        </div>
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
        <div className="flex w-full gap-2">
          <Textarea
            className="w-full grow"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Type your comment here..."
          />
          <Button
            className="self-end"
            size="icon"
            disabled={isSending || !comment}
            onClick={() => void handleOnSendComment()}
          >
            <SendIcon />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
