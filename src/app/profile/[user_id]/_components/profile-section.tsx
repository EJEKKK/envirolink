"use client";
import { useRouter } from "next/navigation";
import * as React from "react";

import { format } from "date-fns";
import {
  type DocumentReference,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Loader, UserIcon } from "lucide-react";
import { toast } from "sonner";

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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { auth, db } from "@/config/firebase";
import { useDebounce } from "@/hooks/use-debounce";
import {
  campaignConverter,
  participationConverter,
  rankDescriptionConverter,
  userConverter,
} from "@/lib/utils";
import type {
  Campaign,
  FrameTier,
  Participation,
  RankDescription,
  User,
} from "@/types";
import EditProfileDialog from "./edit-profile-dialog";
import VolunteerList from "./volunteer-list";

interface ProfileSectionProps {
  userId: string;
}

export default function ProfileSection({ userId }: ProfileSectionProps) {
  const router = useRouter();

  const [user, setUser] = React.useState<User | null>(null);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = React.useState<string | null>(null);
  const [campaignDateSelectData, setCampaignDateSelectData] = React.useState<
    { label: string; value: string }[]
  >([]);
  const [participations, setParticipations] = React.useState<Participation[]>(
    [],
  );
  const [volunteers, setVolunteers] = React.useState<Participation[]>([]);
  const [searchedVolunteer, setSearchedVolunteer] = React.useState<string>("");

  const debouncedSearchedVolunteer = useDebounce<string>(
    searchedVolunteer,
    500,
  );

  const currentUser = auth.currentUser;

  function navigateToDashboard() {
    if (user?.role === "admin") router.push("/admin");

    if (user?.role === "campaignManager")
      router.push("/campaign-manager-dashboard");

    if (user?.role === "volunteer") router.push("/volunteer-dashboard");
  }

  // Function to search for a specific volunteer's participation across all campaigns managed by the current user
  const searchVolunteer = async () => {
    const participationRef = collection(db, "participation").withConverter(
      participationConverter,
    );

    const participationQuery = query(
      participationRef,
      where("status", "==", "joined"),
      where("displayName", "==", debouncedSearchedVolunteer),
      where("campaignid", "==", campaignId),
    );

    const participationSnapshot = await getDocs(participationQuery);

    setVolunteers(participationSnapshot.docs.map((doc) => doc.data()));
  };

  // Fetch user data from Firestore and set up a real-time listener
  React.useEffect(() => {
    const userRef = doc(db, "users", userId).withConverter(userConverter);

    const unsub = onSnapshot(userRef, (doc) => {
      const userData = doc.data();

      setUser({ uid: doc.id, ...userData } as User);
    });

    return () => unsub();
  }, [userId]);

  // Fetch campaigns and join data when user is available
  React.useEffect(() => {
    if (!user || debouncedSearchedVolunteer) return;

    async function fetchCampaigns() {
      const campaignRef = collection(db, "campaigns").withConverter(
        campaignConverter,
      );

      const campaignQuery = query(
        campaignRef,
        where("managerUid", "==", user!.uid),
      );

      const campaignSnapshot = await getDocs(campaignQuery);

      return campaignSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
    }

    async function fetchJoinData() {
      const campaigns = await fetchCampaigns();
      const totalJoinData: { total: number; createdAt: Date }[] = [];
      const participationRef = collection(db, "participation").withConverter(
        participationConverter,
      );

      for (const campaign of campaigns) {
        const participationQuery = query(
          participationRef,
          where("campaignid", "==", campaign.id),
        );

        const participationSnapshot = await getDocs(participationQuery);

        totalJoinData.push({
          total: participationSnapshot.docs.length,
          createdAt: campaign.createdAt.toDate(),
        });
      }
    }

    void fetchJoinData();
  }, [user, debouncedSearchedVolunteer]);

  // Fetch user's participations and campaigns data
  React.useEffect(() => {
    if (!user) return;
    const newParticipations: Participation[] = [];

    const participationRef = collection(db, "participation").withConverter(
      participationConverter,
    );
    const participationQuery = query(
      participationRef,
      where("uid", "==", user.uid),
      where("status", "==", "joined"),
    );

    const participationUnsub = onSnapshot(participationQuery, (snapshot) => {
      const participations: Participation[] = [];

      snapshot.forEach((doc) => {
        const participation = doc.data();

        participations.push({ ...participation, id: doc.id });
        newParticipations.push({ ...participation, id: doc.id });
      });

      setParticipations(participations);
    });

    const campaignRef = collection(db, "campaigns").withConverter(
      campaignConverter,
    );
    const campaignUnsub = onSnapshot(campaignRef, (snapshot) => {
      const campaigns: Campaign[] = [];

      snapshot.forEach((doc) => {
        const campaign = doc.data();

        if (
          newParticipations.some(
            (participation) => participation.campaignid === doc.id,
          )
        ) {
          campaigns.push({ ...campaign, id: doc.id });
        }
      });

      setCampaigns(campaigns);
      setCampaignId(snapshot.docs[0]?.id ?? "");
    });

    return () => {
      participationUnsub();
      campaignUnsub();
    };
  }, [user]);

  // Effect to fetch campaigns created by the current user and populate campaign date select data
  React.useEffect(() => {
    if (!user) return;

    const fetchCampaigns = async () => {
      const campaignRef = collection(db, "campaigns").withConverter(
        campaignConverter,
      );

      const campaignQuery = query(
        campaignRef,
        where("managerUid", "==", user.uid),
      );

      const campaignSnapshot = await getDocs(campaignQuery);

      const campaignData = campaignSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      setCampaignDateSelectData(
        campaignData.map((campaign) => ({
          label: campaign.title,
          value: campaign.id,
        })),
      );
    };

    void fetchCampaigns();
  }, [user]);

  // Effect to fetch volunteer participation data for the selected campaign
  React.useEffect(() => {
    if (!user || !campaignId || !campaigns || debouncedSearchedVolunteer)
      return;

    const getVolunteer = async () => {
      const participationRef = collection(db, "participation").withConverter(
        participationConverter,
      );

      const participationQuery = query(
        participationRef,
        where("status", "==", "joined"),
        where("campaignid", "==", campaignId),
      );

      const participationSnapshot = await getDocs(participationQuery);

      const volunteers = participationSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      setVolunteers(volunteers);
    };

    void getVolunteer();
  }, [user, campaigns, campaignId, debouncedSearchedVolunteer]);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 p-4">
      <h2 className="text-4xl font-bold">Profile</h2>

      <Card className="w-full max-w-xl">
        <CardHeader className="flex flex-col items-center justify-center">
          <Avatar className="size-18">
            <AvatarImage
              src={user?.profilepictureURL ?? ""}
              alt="profile image"
            />
            <AvatarFallback>
              <UserIcon />
            </AvatarFallback>
          </Avatar>
          <CardTitle>{user?.displayName}</CardTitle>
          <CardDescription>
            Points: <span>{user?.points}</span>
          </CardDescription>
        </CardHeader>

        <div className="flex flex-col items-center justify-center gap-4">
          <Frame points={user?.points ?? 0} />
          <p className="text-muted-foreground">{user?.bio ?? "No bio yet"}</p>
        </div>

        <CardFooter className="justify-center gap-4">
          {currentUser?.uid === userId && <EditProfileDialog user={user} />}
          <Button onClick={navigateToDashboard}>Back to Dashboard</Button>
        </CardFooter>
      </Card>

      {user?.role === "campaignManager" && user.status === "approved" && (
        <>
          <h4 className="text-primary text-lg font-bold">Search Volunteer</h4>
          <div className="flex w-full max-w-xl items-center justify-center gap-4">
            <Input
              value={searchedVolunteer}
              onChange={(e) => setSearchedVolunteer(e.target.value)}
              placeholder="Search Volunteer"
            />
            <Button
              disabled={searchedVolunteer.length < 1}
              onClick={() => void searchVolunteer()}
            >
              Search Volunteer
            </Button>
          </div>

          <Card className="w-full max-w-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-2">
                <CardTitle>List of Volunteers</CardTitle>
                <CardDescription>
                  List of volunteers who have joined your campaigns
                </CardDescription>
              </div>
              <Select
                onValueChange={(value) => setCampaignId(value)}
                value={campaignId ?? ""}
              >
                <SelectTrigger className="w-fit shrink-0">
                  <SelectValue placeholder="Select Campaign Date" />
                </SelectTrigger>
                <SelectContent>
                  {campaignDateSelectData.map((data) => (
                    <SelectItem key={data.value} value={data.value}>
                      {data.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {volunteers.length >= 1 ? (
                volunteers.map((volunteer) => (
                  <VolunteerList key={volunteer.id} volunteer={volunteer} />
                ))
              ) : (
                <p className="text-muted-foreground">
                  No volunteers found for this campaign
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <h4 className="text-primary text-lg font-bold">Joined Campaigns</h4>

      {/* Section to display campaigns */}
      {campaigns.length >= 1 ? (
        campaigns.map((campaign) => (
          <CampaignList
            key={campaign.id}
            campaign={campaign}
            participations={participations}
            user={user}
          />
        ))
      ) : (
        <h4 className="text-muted-foreground text-lg font-bold">
          No joined campaigns available yet
        </h4>
      )}
    </main>
  );
}

interface FrameProps {
  points: number;
}

function Frame({ points }: FrameProps) {
  const [rank, setRank] = React.useState<RankDescription | null>(null);

  React.useEffect(() => {
    const rankRef = collection(db, "rankDescription").withConverter(
      rankDescriptionConverter,
    );
    const q = query(rankRef, orderBy("createdAt", "asc"));

    const unsubRank = onSnapshot(q, (snapshot) => {
      for (const doc of snapshot.docs) {
        if (points >= doc.data().points) {
          setRank({ ...doc.data(), id: doc.id });
        }
      }
    });

    return () => unsubRank();
  }, [points]);

  if (!rank) return null;

  return (
    <div className="w-20">
      <AspectRatio className="w-20" ratio={1 / 1}>
        <img src={rank?.image ?? ""} alt="frame" />
      </AspectRatio>
    </div>
  );
}

interface CampaignListProps {
  campaign: Campaign;
  participations: Participation[];
  user: User | null;
}

function CampaignList({ campaign, participations, user }: CampaignListProps) {
  const [frameTier, setFrameTier] = React.useState("unknown");
  const [rankImage, setRankImage] = React.useState("");
  const [isRankDialogOpen, setIsRankDialogOpen] = React.useState(false);
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [type, setType] = React.useState<"promote" | "demote">("promote");

  // Function to handle leaving a campaign
  const handleOnLeaveCampaign = async (campaignId: string) => {
    setIsLeaving(true);
    const user = auth.currentUser;

    try {
      if (user) {
        const participationId = participations.find(
          (participation) => participation.campaignid === campaignId,
        )!.id;

        const uid = user!.uid;

        // Remove the participation record from Firestore
        await deleteDoc(doc(db, "participation", participationId)).catch(() => {
          toast.error("Error leaving campaign. Please try again.");
        });

        const userRef = doc(db, "users", uid).withConverter(userConverter);
        await updateDoc(userRef, { points: increment(-10) }).finally(() => {
          toast.success("Successfully left the campaign and lost 10 points");
          setIsLeaving(false);
        });
        await updateFrameTier(userRef);
        setType("demote");
      }
    } catch (error) {
      toast.error("Error leaving campaign. Please try again.");
      setIsLeaving(false);
    }
  };

  // Helper function to update frame tier
  async function updateFrameTier(userRef: DocumentReference) {
    const userSnap = await getDoc(userRef);
    const rankRef = collection(db, "rankDescription").withConverter(
      rankDescriptionConverter,
    );
    const q = query(rankRef, orderBy("createdAt", "desc"));
    const ranks = await (
      await getDocs(q)
    ).docs.map((doc) => ({ ...doc.data(), id: doc.id }));

    if (userSnap.exists()) {
      const points = userSnap.data().points || 0;

      for (const rank of ranks) {
        if (points >= rank.points) {
          if (userSnap.data().frameTier !== rank.name) {
            await updateDoc(userRef, {
              frameTier: rank.name,
            }).then(() => {
              setFrameTier(rank.name);
              setRankImage(rank.image);
              setIsRankDialogOpen(true);
            });
          }

          if (userSnap.data().frameTier === rank.name) break;
        }
      }
    }
  }

  return (
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

      <RankBadgeDialog
        open={isRankDialogOpen}
        onOpenChange={setIsRankDialogOpen}
        frameTier={frameTier}
        rankImage={rankImage}
        type={type}
      />

      {participations.some(
        (participation) => participation.uid === auth.currentUser?.uid,
      ) && (
        <CardFooter className="flex-col gap-2 sm:flex-row">
          <Button
            className="grow"
            variant="destructive"
            disabled={isLeaving}
            onClick={() => void handleOnLeaveCampaign(campaign.id)}
          >
            {isLeaving ? <Loader className="animate-spin" /> : null} Leave
            Campaign
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

interface RankBadgeDialogProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  frameTier: string;
  rankImage: string;
  type: "promote" | "demote";
}

function RankBadgeDialog({
  open = true,
  onOpenChange,
  frameTier,
  rankImage,
  type,
}: RankBadgeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Congratulations 🎉</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative w-40">
            <AspectRatio ratio={1 / 1}>
              <img
                className="size-full object-cover"
                src={rankImage}
                alt="frame tier"
              />
            </AspectRatio>
          </div>
          {type === "promote"
            ? "You have been promoted to the"
            : "You have been demoted to the"}
          <span className="font-bold">
            {frameTier.charAt(0).toUpperCase() + frameTier.slice(1)}
          </span>{" "}
          tier!{" "}
          {type === "promote"
            ? "Keep up the great work and continue participating to earn more points and rewards."
            : "You can try to earn back your previous rank by participating in more campaigns."}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button className="w-full">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
