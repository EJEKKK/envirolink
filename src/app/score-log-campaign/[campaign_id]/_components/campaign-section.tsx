"use client";
import * as React from "react";

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
import { db } from "@/config/firebase";
import { getFrame } from "@/helper";
import { useIsClient } from "@/hooks/use-is-client";
import {
  cn,
  commentConverter,
  formatCompactNumber,
  participationConverter,
} from "@/lib/utils";
import type { Comment, ServerCampaign } from "@/types";

import { format, intlFormatDistance } from "date-fns";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { MessageCircleIcon } from "lucide-react";

interface CampaignSectionProps {
  campaign: ServerCampaign;
}

export default function CampaignSection({ campaign }: CampaignSectionProps) {
  const [isLightBoxOpen, setIsLightBoxOpen] = React.useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = React.useState(false);
  const [current, setCurrent] = React.useState(0);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [shareCount, setShareCount] = React.useState(0);

  const isClient = useIsClient();

  function handleOnImageClick(index: number) {
    setIsLightBoxOpen(true);
    setCurrent(index);
  }

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
    const unsub = onSnapshot(campaignRef, async (doc) => {
      if (doc.exists()) {
        const commentQuery = query(
          commentsRef,
          where("campaignRef", "==", campaignRef),
          orderBy("timestamp", "desc"),
        ).withConverter(commentConverter);
        await onSnapshot(commentQuery, (snapshot) => {
          const comments = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
          }));
          setComments(comments);
        });
      }
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

  if (!isClient) return null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <Card className="w-full max-w-2xl">
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
                  campaign.description.when,
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
                  <AspectRatio ratio={1 / 1}>
                    <img
                      className="h-full object-cover object-center"
                      src={photo}
                      alt="campaign"
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
        <CardFooter className="flex flex-col gap-2 sm:flex-row">
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
            <Card key={comment.id} className="w-full max-w-2xl p-0">
              <CardContent className="p-2">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={comment.userPhotoURL ?? ""} />
                        <AvatarFallback>
                          {comment.displayName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
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
                        comment.timestamp.toDate(),
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
    </main>
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
          <DialogDescription />
        </DialogHeader>
        <div className="relative flex w-full flex-col items-center gap-4">
          <Carousel
            className="w-10/12"
            setApi={setApi}
            opts={{ startIndex: activeIndex, loop: true }}
          >
            <CarouselContent>
              {photoURLs.map((photo) => (
                <CarouselItem key={`${crypto.randomUUID()}`}>
                  <Card>
                    <CardContent>
                      <div className="relative overflow-hidden">
                        <AspectRatio ratio={16 / 9}>
                          <img
                            className="size-full object-cover object-center"
                            src={photo}
                            alt="campaign"
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
  }, [campaignId]);

  if (isFetching || comments.length < 1) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
          <DialogDescription />
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
                          <Avatar>
                            <AvatarImage src={comment.userPhotoURL ?? ""} />
                            <AvatarFallback>
                              {comment.displayName.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
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
      </DialogContent>
    </Dialog>
  );
}
