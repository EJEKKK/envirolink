"use client";
import { useRouter } from "next/navigation";
import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, intlFormatDistance, isAfter, isBefore } from "date-fns";
import { onAuthStateChanged } from "firebase/auth";
import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDocs,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	where,
} from "firebase/firestore";
import {
	Edit2Icon,
	EllipsisIcon,
	Loader2Icon,
	MessageCircleIcon,
	PlusCircleIcon,
	SendIcon,
	TrashIcon,
	XIcon,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import DateRangePicker from "@/components/date-range-picker";
import { MultiSelect } from "@/components/multi-select";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from "@/config/firebase";
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
import { type PointFormSchema, pointFormSchema } from "../_lib/validations";
import AcceptCampaignDialog from "./_components/accept-campaign-dialog";
import DeleteCampaignDialog from "./_components/delete-campaign-dialog";
import EditCampaignDialog from "./_components/edit-campaign-dialog";
import JoinedVolunteerList from "./_components/joined-volunteer-list";
import RejectCampaignDialog from "./_components/reject-campaign-dialog";
import VolunteerAttendanceDialog from "./_components/volunteer-attendance-dialog";

const CATEGORY_OPTIONS: Array<{
	label: string;
	value: string;
	icon?: React.ComponentType<{ className?: string }>;
}> = [
	{ label: "New", value: "new" },
	{ label: "On Going", value: "on-going" },
	{ label: "Done", value: "done" },
];

export default function Campaigns() {
	const router = useRouter();

	const [user, setUser] = React.useState<User | null>(null);
	const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
	const [participations, setParticipations] = React.useState<Participation[]>(
		[],
	);
	const [date, setDate] = React.useState<DateRange | undefined>();
	const [isFetching, setIsFetching] = React.useState(false);

	//Filter State
	const [categories, setCategories] = React.useState<string[]>([]);

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
			const points = {
				...pointsSnapshot.docs[0]?.data(),
				id: pointsSnapshot.docs[0]?.id,
			} as Points;

			return points;
		};

		const campaignQuery = query(
			collection(db, "campaigns").withConverter(campaignConverter),
			orderBy("createdAt", "desc"),
		);
		const unsubCampaign = onSnapshot(campaignQuery, async (snapshot) => {
			setIsFetching(true);
			const newCampaigns: Campaign[] = [];

			for (const doc of snapshot.docs) {
				const likes = await getLikes(doc.id);
				const points = (await getPoints(doc.id)) as Points;

				for (const category of categories) {
					if (
						category === "on-going" &&
						!doc.data().isDone &&
						doc.data().description.when.toDate() <= new Date()
					) {
						newCampaigns.push({
							...doc.data(),
							id: doc.id,
							likes,
							points,
						});
					}

					if (category === "done" && doc.data().isDone) {
						newCampaigns.push({
							...doc.data(),
							id: doc.id,
							likes,
							points,
						});
					}

					if (
						category === "new" &&
						!doc.data().isDone &&
						doc.data().description.when.toDate() > new Date()
					) {
						newCampaigns.push({
							...doc.data(),
							id: doc.id,
							likes,
							points,
						});
					}
				}

				if (categories.length === 0) {
					newCampaigns.push({ ...doc.data(), likes, points, id: doc.id });
				}
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
	}, [user, categories, date]);

	return (
		<>
			<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
				<div className="flex items-center gap-2 px-4">
					<SidebarTrigger className="-ml-1" />
					<h4 className="text-lg font-semibold">Approved Campaigns</h4>
				</div>
			</header>

			{/* Campaign List */}
			<section className="flex w-full flex-col items-center gap-4 p-4">
				{/* Toolbar */}
				<div className="container flex w-full flex-wrap items-center gap-2">
					<MultiSelect
						className="w-full md:w-fit"
						options={CATEGORY_OPTIONS}
						value={categories}
						onValueChange={(value) => setCategories(value)}
						placeholder="Select categories"
					/>
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

				<Tabs className="w-full" defaultValue="pending">
					<TabsList>
						<TabsTrigger value="pending">Pending</TabsTrigger>
						<TabsTrigger value="approved">Approved</TabsTrigger>
						<TabsTrigger value="complete">Complete</TabsTrigger>
					</TabsList>
					<TabsContent
						className="container grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
						value="approved"
					>
						{isFetching ? (
							<div className="flex items-center justify-center md:col-span-2 lg:col-span-3">
								<Loader2Icon className="text-primary animate-spin" />
							</div>
						) : campaigns.filter(
								(campaign) =>
									campaign.status === "approved" && !campaign.isDone,
							).length >= 1 ? (
							campaigns
								.filter(
									(campaign) =>
										campaign.status === "approved" && !campaign.isDone,
								)
								.map((campaign) => (
									<CampaignList
										key={campaign.id}
										campaign={campaign}
										participations={participations}
										user={user as User}
									/>
								))
						) : (
							<div className="text-center md:col-span-2 lg:col-span-3">
								<h4 className="text-muted-foreground text-lg font-bold">
									No campaigns to show
								</h4>
							</div>
						)}
					</TabsContent>
					<TabsContent
						className="container grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
						value="pending"
					>
						{isFetching ? (
							<div className="flex items-center justify-center md:col-span-2 lg:col-span-3">
								<Loader2Icon className="text-primary animate-spin" />
							</div>
						) : campaigns.filter((campaign) => campaign.status === "pending")
								.length >= 1 ? (
							campaigns
								.filter((campaign) => campaign.status === "pending")
								.map((campaign) => (
									<CampaignList
										key={campaign.id}
										campaign={campaign}
										participations={participations}
										user={user as User}
									/>
								))
						) : (
							<div className="text-center md:col-span-2 lg:col-span-3">
								<h4 className="text-muted-foreground text-lg font-bold">
									No campaigns to show
								</h4>
							</div>
						)}
					</TabsContent>
					<TabsContent
						className="container grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
						value="complete"
					>
						{isFetching ? (
							<div className="flex items-center justify-center md:col-span-2 lg:col-span-3">
								<Loader2Icon className="text-primary animate-spin" />
							</div>
						) : campaigns.filter(
								(campaign) => campaign.status === "approved" && campaign.isDone,
							).length >= 1 ? (
							campaigns
								.filter(
									(campaign) =>
										campaign.status === "approved" && campaign.isDone,
								)
								.map((campaign) => (
									<CampaignList
										key={campaign.id}
										campaign={campaign}
										participations={participations}
										user={user as User}
									/>
								))
						) : (
							<div className="text-center md:col-span-2 lg:col-span-3">
								<h4 className="text-muted-foreground text-lg font-bold">
									No campaigns to show
								</h4>
							</div>
						)}
					</TabsContent>
				</Tabs>
			</section>
		</>
	);
}

interface CampaignListProps {
	campaign: Campaign;
	participations: Participation[];
	user: User;
}

function CampaignList({ campaign, participations, user }: CampaignListProps) {
	const form = useForm<PointFormSchema>({
		resolver: zodResolver(pointFormSchema),
		defaultValues: {
			points: { like: 0, comment: 0, share: 0, campaignManager: 20 },
		},
	});

	const [isLightBoxOpen, setIsLightBoxOpen] = React.useState(false);
	const [isCommentDialogOpen, setIsCommentDialogOpen] = React.useState(false);
	const [isDeleteCampaignDialogOpen, setIsDeleteCampaignDialogOpen] =
		React.useState(false);
	const [current, setCurrent] = React.useState(0);
	const [comments, setComments] = React.useState<Comment[]>([]);
	const [shareCount, setShareCount] = React.useState(0);
	const [editScoreOpen, setEditScoreOpen] = React.useState(false);
	const [isVolunteerListOpened, setIsVolunteerListOpened] =
		React.useState(false);
	const [isAcceptDialogOpen, setIsAcceptDialogOpen] = React.useState(false);
	const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
	const [isVolunteerDialogOpened, setIsSetVolunteerDialogOpened] =
		React.useState(false);

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
		const unsub = onSnapshot(campaignRef, (doc) => {
			if (doc.exists()) {
				const commentQuery = query(
					commentsRef,
					where("campaignRef", "==", campaignRef),
					orderBy("timestamp", "desc"),
				).withConverter(commentConverter);
				onSnapshot(commentQuery, (snapshot) => {
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

	return (
		<div className="flex w-full max-w-2xl flex-col gap-4">
			<Card className="w-full max-w-2xl">
				<CardHeader>
					<CardTitle className="flex items-center justify-between font-bold">
						<p>{campaign.title}</p>

						<div className="flex items-center gap-2">
							<Badge
								className={cn("cursor-pointer")}
								variant={campaign.isDone ? "outline" : "default"}
							>
								{campaign.isDone && !campaign.isScoreApplied
									? "Done"
									: campaign.isDone && campaign.isScoreApplied
										? "Completed"
										: campaign.description.when.toDate() <= new Date()
											? "Ongoing"
											: "New"}
							</Badge>
							<DropdownMenu>
								{campaign.status !== "pending" && (
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon">
											<EllipsisIcon />
										</Button>
									</DropdownMenuTrigger>
								)}
								<DropdownMenuContent>
									{campaign.isDone && !campaign.isScoreApplied ? (
										<DropdownMenuItem
											onClick={() => setIsVolunteerListOpened(true)}
										>
											<PlusCircleIcon /> Add score
										</DropdownMenuItem>
									) : null}
									<DropdownMenuItem onClick={() => setEditScoreOpen(true)}>
										<Edit2Icon /> Edit campaign scores
									</DropdownMenuItem>
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() => setIsDeleteCampaignDialogOpen(true)}
									>
										<TrashIcon className="text-destructive" /> Delete campaign
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</CardTitle>
					<Separator className="my-2" />
					<CardDescription className="flex w-full flex-col gap-4">
						<div className="grid gap-4 text-sm md:grid-cols-2">
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

							<Button onClick={() => setIsSetVolunteerDialogOpened(true)}>
								View joined volunteers
							</Button>
							<JoinedVolunteerList
								open={isVolunteerDialogOpened}
								onOpenChange={setIsSetVolunteerDialogOpened}
								participations={participations.filter(
									(participation) => participation.campaignid === campaign.id,
								)}
								user={user}
								campaign={campaign}
							/>
						</div>
						<Separator />
						<div className="grid gap-4 text-sm md:grid-cols-2">
							<div>
								<p>Like</p>
								<p className="text-primary font-semibold">
									{campaign.points?.like ?? 0} pts
								</p>
							</div>

							<div>
								<p>Comment</p>
								<p className="text-primary font-semibold">
									{campaign.points?.comment ?? 0} pts
								</p>
							</div>

							<div>
								<p>Share</p>
								<p className="text-primary font-semibold">
									{campaign.points?.share ?? 0} pts
								</p>
							</div>
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

					<VolunteerAttendanceDialog
						open={isVolunteerListOpened}
						onOpenChange={setIsVolunteerListOpened}
						participations={participations.filter(
							(participation) =>
								participation.isPresent &&
								participation.campaignid === campaign.id,
						)}
						campaign={campaign}
					/>

					<CommentsDialog
						campaignId={campaign.id}
						open={isCommentDialogOpen}
						onOpenChange={setIsCommentDialogOpen}
					/>

					<EditCampaignDialog
						campaign={campaign}
						open={editScoreOpen}
						onOpenChange={setEditScoreOpen}
					/>

					<DeleteCampaignDialog
						campaignId={campaign.id}
						open={isDeleteCampaignDialogOpen}
						onOpenChange={setIsDeleteCampaignDialogOpen}
					/>

					<p className="text-muted-foreground my-2 text-sm">
						Submitted by: {campaign.managerDisplayName}
					</p>

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

					{campaign.status === "pending" && (
						<Form {...form}>
							<h4 className="my-4 text-lg font-semibold">Points</h4>

							<AcceptCampaignDialog
								open={isAcceptDialogOpen}
								onOpenChange={setIsAcceptDialogOpen}
								campaign={campaign}
							/>

							<RejectCampaignDialog
								open={isRejectDialogOpen}
								onOpenChange={setIsRejectDialogOpen}
								campaign={campaign}
							/>

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
						</Form>
					)}
				</CardContent>
				<CardFooter className="flex-col gap-2">
					{campaign.status === "pending" ? (
						<>
							<Button
								className="w-full grow cursor-pointer"
								onClick={() => setIsAcceptDialogOpen(true)}
							>
								Accept
							</Button>
							<Button
								className="w-full grow cursor-pointer"
								variant="destructive"
								onClick={() => setIsRejectDialogOpen(true)}
							>
								Reject
							</Button>
						</>
					) : (
						<Button
							className="w-full grow cursor-pointer"
							variant="ghost"
							onClick={() => setIsCommentDialogOpen(true)}
						>
							<MessageCircleIcon /> Comment
						</Button>
					)}
				</CardFooter>
			</Card>
			{comments.length >= 1
				? comments.slice(0, 3).map((comment) => (
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
												{(comment.rankImage?.length as number) > 0 && (
													<img
														className="size-4"
														src={comment.rankImage}
														alt={comment.displayName}
													/>
												)}
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
	const [isSending, setIsSending] = React.useState(false);
	const [isFetching, setIsFetching] = React.useState(false);
	const [comment, setComment] = React.useState("");

	const handleOnSendComment = async () => {
		setIsSending(true);
		const user = auth.currentUser;

		if (user) {
			try {
				const campaignRef = doc(db, "campaigns", campaignId);

				const commentData = {
					comment,
					displayName: user.displayName || "Anonymous",
					timestamp: serverTimestamp(),
					uid: user.uid,
					campaignRef: campaignRef,
				};

				// Add the comment to the 'comments' collection
				await addDoc(collection(db, "comments"), commentData);

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

	const onHandleDeleteComment = async (commentId: string) => {
		const commentRef = doc(db, "comments", commentId);
		await deleteDoc(commentRef)
			.finally(() => {
				toast.success("Comment deleted successfully!");
			})
			.catch(() => {
				toast.error("Error deleting comment. Please try again.");
			});
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
								<div key={comment.id} className="flex items-center gap-2">
									<Card className="w-full p-0">
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
															{(comment.rankImage?.length as number) > 0 && (
																<img
																	className="size-4"
																	src={comment.rankImage}
																	alt={comment.displayName}
																/>
															)}
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

									<Button
										size="icon"
										variant="destructive"
										onClick={() => onHandleDeleteComment(comment.id)}
									>
										<TrashIcon />
									</Button>
								</div>
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
