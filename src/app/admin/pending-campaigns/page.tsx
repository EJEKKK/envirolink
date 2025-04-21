"use client";
import { useRouter } from "next/navigation";
import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { onAuthStateChanged } from "firebase/auth";
import {
  type DocumentReference,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useForm, useFormContext } from "react-hook-form";
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
} from "@/components/ui/alert-dialog";
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
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { auth, db } from "@/config/firebase";
import { campaignConverter, cn, userConverter } from "@/lib/utils";
import type { Campaign, FrameTier, User } from "@/types";
import { type PointFormSchema, pointFormSchema } from "../_lib/validations";
import type { z } from "zod";

export default function PendingCampaigns() {
  const router = useRouter();

  const [user, setUser] = React.useState<User | null>(null);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);

  // Effect to handle authentication state changes
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }

      const userRef = doc(db, "users", user!.uid).withConverter(userConverter);
      onSnapshot(userRef, (doc) => {
        const userData = doc.data();
        setUser({ ...userData, uid: doc.id } as User);
      });
    });

    return () => unsub();
  }, [router.push]);

  // Effect to handle real-time updates to campaigns collection
  React.useEffect(() => {
    if (!user) return;

    const campaignQuery = query(
      collection(db, "campaigns").withConverter(campaignConverter),
      where("status", "==", "pending"),
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
  }, [user]);

  if (!user) return null;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <h4 className="text-lg font-semibold">Pending Campaigns</h4>
        </div>
      </header>

      <div className="flex flex-col gap-4 p-6">
        {/* Campaign List */}
        {campaigns.length >= 1 ? (
          campaigns.map((campaign) => (
            <CampaignList key={campaign.id} campaign={campaign} />
          ))
        ) : (
          <h4 className="text-muted-foreground text-lg font-bold">
            No pending campaigns available yet
          </h4>
        )}
      </div>
    </>
  );
}

interface CampaignListProps {
  campaign: Campaign;
}

function CampaignList({ campaign }: CampaignListProps) {
  const form = useForm<PointFormSchema>({
    resolver: zodResolver(pointFormSchema),
    defaultValues: {
      points: { like: 0, comment: 0, share: 0, join: 0, campaignManager: 20 },
    },
  });
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = React.useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [isLightBoxOpen, setIsLightBoxOpen] = React.useState(false);
  const [current, setCurrent] = React.useState(0);

  function handleOnImageClick(index: number) {
    setIsLightBoxOpen(true);
    setCurrent(index);
  }

  return (
    <Form {...form}>
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
        <CardContent className="space-y-4">
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

          <AcceptCampaignDialog
            campaign={campaign}
            open={isAcceptDialogOpen}
            onOpenChange={setIsAcceptDialogOpen}
          />

          <RejectCampaignDialog
            open={isRejectDialogOpen}
            onOpenChange={setIsRejectDialogOpen}
            campaign={campaign}
          />

          <CampaignLightBoxDialog
            open={isLightBoxOpen}
            onOpenChange={setIsLightBoxOpen}
            activeIndex={current}
            photoURLs={campaign.photoURLs}
          />

          <p className="text-muted-foreground text-sm">
            Submitted by: {campaign.managerDisplayName}
          </p>

          <Separator />

          <h4 className="text-lg font-semibold">Points</h4>

          <form className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="points.like"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Like</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="points.comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comment</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="points.share"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Share</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="points.join"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Join</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="points.campaignManager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Manager</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2 sm:flex-row">
          <Button
            className="w-full grow cursor-pointer sm:w-auto"
            onClick={() => setIsAcceptDialogOpen(true)}
          >
            Accept
          </Button>
          <Button
            className="w-full grow cursor-pointer sm:w-auto"
            variant="destructive"
            onClick={() => setIsRejectDialogOpen(true)}
          >
            Reject
          </Button>
        </CardFooter>
      </Card>
    </Form>
  );
}

interface AcceptCampaignDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}

function AcceptCampaignDialog({
  campaign,
  open,
  onOpenChange,
}: AcceptCampaignDialogProps) {
  const form = useFormContext<z.infer<typeof pointFormSchema>>();

  // Handle accepting a campaign and updating points
  const handleOnAccept = async (values: z.infer<typeof pointFormSchema>) => {
    try {
      const campaignRef = doc(db, "campaigns", campaign.id).withConverter(
        campaignConverter,
      );
      const campaignSnap = await getDoc(campaignRef);
      const campaignData = campaignSnap.data();

      await updateDoc(campaignRef, { status: "approved" });

      await addDoc(collection(db, "campaigns", campaign.id, "points"), {
        like: Number(values.points.like) ?? 0,
        comment: Number(values.points.comment) ?? 0,
        share: Number(values.points.share) ?? 0,
        join: Number(values.points.join) ?? 0,
      });

      // Award 50 points to the manager
      const managerRef = doc(
        db,
        "users",
        campaignData!.managerUid,
      ).withConverter(userConverter);
      await updateDoc(managerRef, {
        points: increment(Number(values.points.campaignManager)),
      });

      toast.success("Campaign approved successfully.");
    } catch (error) {
      console.error("Error approving campaign:", error);
      toast.error("Error approving campaign. Please try again.");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Accept Campaign</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to approve this campaign?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={form.handleSubmit(handleOnAccept)}>
            Accept
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface RejectCampaignDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}

function RejectCampaignDialog({
  campaign,
  open,
  onOpenChange,
}: RejectCampaignDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleOnReject = async () => {
    setIsLoading(true);
    try {
      const campaignRef = doc(db, "campaigns", campaign!.id);
      await deleteDoc(campaignRef);
      toast.success("Campaign rejected successfully.");
      setIsLoading(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error rejecting campaign:", error);
      toast.error("Error rejecting campaign. Please try again.");
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Campaign</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reject this campaign?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isLoading}
            onClick={() => void handleOnReject()}
          >
            Reject
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
