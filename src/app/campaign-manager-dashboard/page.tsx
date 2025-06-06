"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, intlFormatDistance, isAfter, isBefore } from "date-fns";
import { onAuthStateChanged, signOut } from "firebase/auth";
import * as firestore from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
	CloudUploadIcon,
	Loader,
	MessageCircleIcon,
	SendIcon,
	Share2Icon,
	ThumbsUpIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as shallow from "zustand/shallow";

import DatePicker from "@/components/date-picker";
import DateRangePicker from "@/components/date-range-picker";
import { MultiSelect } from "@/components/multi-select";
import Navbar from "@/components/shared/navbar";
import ScoringLogDialog from "@/components/shared/scoring-log-dialog";
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
	DropZoneArea,
	Dropzone,
	DropzoneDescription,
	DropzoneFileList,
	DropzoneFileListItem,
	DropzoneMessage,
	DropzoneRemoveFile,
	DropzoneTrigger,
	useDropzone,
} from "@/components/ui/dropzone";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { auth, db, storage } from "@/config/firebase";
import { addScoreLog } from "@/helper";
import useCreateCampaignStore from "@/hooks/use-create-campaign-store";
import useEditCampaignStore from "@/hooks/use-edit-campaign-store";
import {
	campaignConverter,
	cn,
	commentConverter,
	formatCompactNumber,
	likeConverter,
	participationConverter,
	pointsConverter,
	rankDescriptionConverter,
	userConverter,
} from "@/lib/utils";
import {
	type CreateCampaignSchema,
	type EditCampaignSchema,
	createCampaignSchema,
	editCampaignSchema,
} from "@/lib/validations";
import type { Campaign, Comment, Participation, Points, User } from "@/types";
import CampaignDropdownMenu from "./_components/campaign-dropdown-menu";
import JoinedVolunteerList from "./_components/joined-volunteer-list";
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

export default function CampaignManagerDashboard() {
	const router = useRouter();
	const [user, setUser] = React.useState<User | null>(null);
	const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
	const [participations, setParticipations] = React.useState<Participation[]>(
		[],
	);
	const [date, setDate] = React.useState<DateRange | undefined>();

	//Filter State
	const [categories, setCategories] = React.useState<string[]>([]);

	// Effect to handle authentication state changes
	React.useEffect(() => {
		const unsub = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				router.push("/");
				return;
			}

			const userRef = firestore
				.doc(db, "users", user?.uid as string)
				.withConverter(userConverter);
			firestore.onSnapshot(userRef, (doc) => {
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

		const getLikes = async (docId: string) => {
			const likeRef = firestore
				.collection(db, "campaigns", docId, "likes")
				.withConverter(likeConverter);
			const likeSnapshot = await firestore.getDocs(likeRef);
			const likes = likeSnapshot.docs.map((doc) => ({
				...doc.data(),
				id: doc.id,
			}));

			return likes;
		};

		const getPoints = async (docId: string) => {
			const pointsRef = firestore
				.collection(db, "campaigns", docId, "points")
				.withConverter(pointsConverter);

			const pointsSnapshot = await firestore.getDocs(pointsRef);
			const points = pointsSnapshot.docs[0]?.data() as Points;

			return points;
		};

		const campaignQuery = firestore.query(
			firestore.collection(db, "campaigns").withConverter(campaignConverter),
			firestore.where("status", "==", "approved"),
			firestore.orderBy("createdAt", "desc"),
		);
		const unsubCampaign = firestore.onSnapshot(
			campaignQuery,
			async (snapshot) => {
				const newCampaigns: Campaign[] = [];

				for (const doc of snapshot.docs) {
					const likes = await getLikes(doc.id);
					const points = (await getPoints(doc.id)) as Points;

					for (const category of categories) {
						if (
							category === "on-going" &&
							doc.data().description.when.toDate() <= new Date() &&
							!doc.data().isDone
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
				} else {
					setCampaigns(newCampaigns);
				}
			},
		);

		const participationQuery = firestore.query(
			firestore
				.collection(db, "participation")
				.withConverter(participationConverter),
			firestore.where("status", "==", "joined"),
		);

		const unsubParticipation = firestore.onSnapshot(
			participationQuery,
			(snapshot) => {
				const newParticipations: Participation[] = [];

				for (const doc of snapshot.docs) {
					const participation = doc.data();

					newParticipations.push({ ...participation, id: doc.id });
				}

				setParticipations(newParticipations);
			},
		);

		return () => {
			unsubCampaign();
			unsubParticipation();
		};
	}, [user, categories, date]);

	// // Add a useEffect to fetch likes for each campaign
	// React.useEffect(() => {
	//   if (campaigns.length < 1) return;
	//
	//   const fetchLikes = async () => {
	//     const newCampaigns: Campaign[] = [];
	//
	//     for (const campaign of campaigns) {
	//       const likeRef = collection(
	//         db,
	//         "campaigns",
	//         campaign.id,
	//         "likes",
	//       ).withConverter(likeConverter);
	//       const likeSnapshot = await getDocs(likeRef);
	//       const likes = likeSnapshot.docs.map((doc) => ({
	//         ...doc.data(),
	//         id: doc.id,
	//       }));
	//       newCampaigns.push({ ...campaign, likes });
	//     }
	//
	//     setCampaigns(newCampaigns);
	//   };
	//
	//   void fetchLikes();
	// }, [campaigns]);

	if (!user) return null;

	return (
		<main className="flex flex-col items-center gap-4">
			<Navbar user={user} />
			<Card
				className={cn(
					"hidden w-full max-w-2xl",
					user.status === "pending" && "flex",
				)}
			>
				<CardContent>
					<CardTitle className="text-center text-4xl font-bold">
						Pending for Approval
					</CardTitle>
					<CardDescription>
						{user.status === "rejected" ? (
							<p className="text-muted-foreground text-center text-lg font-bold">
								Your account has been rejected.
							</p>
						) : (
							<p className="text-muted-foreground text-center text-lg font-bold">
								Your account is pending approval.
							</p>
						)}
					</CardDescription>
				</CardContent>
			</Card>

			<CreateCampaignForm user={user} />
			<ScoringLogDialog user={user} />

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

				<Tabs className="container w-full" defaultValue="all">
					<TabsList className="grid w-fit grid-cols-2 justify-self-end">
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="your-campaigns">Your Campaigns</TabsTrigger>
					</TabsList>
					<TabsContent
						className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
						value="all"
					>
						{campaigns.length >= 1 && user.status === "approved" ? (
							campaigns.map((campaign) => (
								<CampaignList
									key={campaign.id}
									campaign={campaign}
									participations={participations}
									user={user}
								/>
							))
						) : (
							<div className="col-span-1 flex items-center justify-center sm:col-span-3 md:col-span-4">
								<h4 className="text-muted-foreground text-lg font-bold">
									{user.status === "approved"
										? "No campaigns available yet"
										: "No campaigns to show"}
								</h4>
							</div>
						)}
					</TabsContent>
					<TabsContent
						className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
						value="your-campaigns"
					>
						{campaigns.length >= 1 && user.status === "approved" ? (
							campaigns
								.filter((campaign) => campaign.managerUid === user.uid)
								.map((campaign) => (
									<CampaignList
										key={campaign.id}
										campaign={campaign}
										participations={participations}
										user={user}
									/>
								))
						) : (
							<div className="col-span-1 flex items-center justify-center sm:col-span-3 md:col-span-4">
								<h4 className="text-muted-foreground text-lg font-bold">
									{user.status === "approved"
										? "No campaigns available yet"
										: "No campaigns to show"}
								</h4>
							</div>
						)}
					</TabsContent>
				</Tabs>
			</section>
		</main>
	);
}

interface CreateCampaignFormProps {
	user: User | null;
}

function CreateCampaignForm({ user }: CreateCampaignFormProps) {
	const { isCreateCampaignOpen, setIsCreateCampaignOpen } =
		useCreateCampaignStore(
			shallow.useShallow((state) => ({
				isCreateCampaignOpen: state.open,
				setIsCreateCampaignOpen: state.setOpen,
			})),
		);

	const [isPosting, setIsPosting] = React.useState(false);
	const [time, setTime] = React.useState<string>("00:00");
	const form = useForm<CreateCampaignSchema>({
		resolver: zodResolver(createCampaignSchema),
		defaultValues: {
			title: "",
			description: {
				where: "",
				what: "",
				when: new Date(),
			},
			photoURLs: [],
		},
	});
	const photoURLs = form.watch("photoURLs");

	const dropzone = useDropzone({
		onDropFile: async (file: File) => {
			photoURLs.push(file);
			await new Promise((resolve) => setTimeout(resolve, 1000));
			return {
				status: "success",
				result: URL.createObjectURL(file),
			};
		},
		shiftOnMaxFiles: true,
		validation: {
			accept: {
				"image/*": [".png", ".jpg", ".jpeg"],
			},
			maxSize: 10 * 1024 * 1024,
			maxFiles: 10,
		},
	});

	const handleOnPostCampaign = async ({
		photoURLs,
		title,
		description,
	}: CreateCampaignSchema) => {
		try {
			setIsPosting(true);
			const storageURLs = [];

			// Upload photos to Firebase Storage if any files are selected
			if (photoURLs.length >= 1) {
				for (let i = 0; i < photoURLs.length; i++) {
					const photo = photoURLs[i] as File;
					const storageRef = ref(storage, `campaign_photos/${photo.name}`);
					await uploadBytes(storageRef, photo);
					const photoURL = await getDownloadURL(storageRef); // Get the URL after uploading
					storageURLs.push(photoURL);
				}
			}

			if (storageURLs.length < 1) {
				toast.error("Please upload at least one image.");
				setIsPosting(false);
				return;
			}

			// Add a new campaign with "pending" status
			await firestore
				.addDoc(firestore.collection(db, "campaigns"), {
					title,
					description: {
						what: description.what,
						where: description.where,
						when: description.when,
					},
					photoURLs: storageURLs,
					createdAt: firestore.serverTimestamp(),
					managerUid: user!.uid,
					managerDisplayName: user!.displayName,
					managerPhotoURL: user!.profilepictureURL,
					status: "pending", // New campaigns will have "pending" status
					frameTier: user!.frameTier,
					isDone: false,
					isScoreApplied: false,
				})
				.finally(() => {
					toast.success("Campaign submitted for approval.");
					form.reset(); // Clear the form
					setIsPosting(false);
					setIsCreateCampaignOpen(false); // Close the dialog
				});
		} catch (error) {
			toast.error("Error posting campaign. Please try again.");
			setIsPosting(false);
			setIsCreateCampaignOpen(false); // Close the dialog
		}
	};

	return (
		<Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New Campaign</DialogTitle>
					<DialogDescription>
						Fill in the details below to create a new campaign.
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="h-96">
					<Form {...form}>
						<form
							className="flex flex-col gap-4"
							onSubmit={form.handleSubmit(handleOnPostCampaign)}
						>
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>Campaign Title</FormLabel>
										<FormControl>
											<Input {...field} placeholder="Enter your title here" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description.when"
								render={({ field }) => (
									<FormItem>
										<FormLabel>When</FormLabel>
										<FormControl>
											<div className="flex w-full flex-col gap-4 sm:flex-row">
												<DatePicker
													triggerClassName="w-full md:w-fit"
													date={field.value}
													onValueChanged={(date) =>
														form.setValue("description.when", date)
													}
												/>

												<Select
													defaultValue={time!}
													onValueChange={(e) => {
														setTime(e);
														if (field.value) {
															const [hours, minutes] = e.split(":");
															const newDate = new Date(field.value.getTime());
															newDate.setHours(
																Number.parseInt(hours!),
																Number.parseInt(minutes!),
															);
															field.onChange(newDate);
														}
													}}
												>
													<SelectTrigger className="w-full shrink-0 font-normal focus:ring-0 focus:ring-offset-0 sm:w-[120px]">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<ScrollArea className="h-[15rem]">
															{Array.from({ length: 96 }).map((_, i) => {
																const hour = Math.floor(i / 4)
																	.toString()
																	.padStart(2, "0");
																const minute = ((i % 4) * 15)
																	.toString()
																	.padStart(2, "0");
																return (
																	<SelectItem
																		key={i}
																		value={`${hour}:${minute}`}
																	>
																		{hour}:{minute}
																	</SelectItem>
																);
															})}
														</ScrollArea>
													</SelectContent>
												</Select>
											</div>
										</FormControl>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description.where"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>Where</FormLabel>
										<FormControl>
											<Input {...field} placeholder="(e.g., location)" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description.what"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>What</FormLabel>
										<FormControl>
											<Input {...field} placeholder="(e.g., ML Tournament)" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="photoURLs"
								render={() => (
									<FormItem className="flex flex-col">
										<FormLabel>Images</FormLabel>
										<FormControl>
											<div className="not-prose flex flex-col gap-4">
												<Dropzone {...dropzone}>
													<div>
														<div className="flex justify-between">
															<DropzoneDescription>
																Please select up to 10 images
															</DropzoneDescription>
															<DropzoneMessage />
														</div>
														<DropZoneArea>
															<DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm">
																<CloudUploadIcon className="size-8" />
																<div>
																	<p className="font-semibold">Upload images</p>
																	<p className="text-muted-foreground text-sm">
																		Click here or drag and drop to upload
																	</p>
																</div>
															</DropzoneTrigger>
														</DropZoneArea>
													</div>

													<DropzoneFileList className="grid gap-3 p-0 md:grid-cols-2 lg:grid-cols-3">
														{dropzone.fileStatuses.map((file) => (
															<DropzoneFileListItem
																className="bg-secondary overflow-hidden rounded-md p-0 shadow-sm"
																key={file.id}
																file={file}
															>
																{file.status === "pending" && (
																	<div className="aspect-video animate-pulse bg-black/20" />
																)}
																{file.status === "success" && (
																	// eslint-disable-next-line @next/next/no-img-element
																	<img
																		src={file.result}
																		alt={`uploaded-${file.fileName}`}
																		className="aspect-video object-cover"
																	/>
																)}
																<div className="flex items-center justify-between p-2 pl-4">
																	<div className="min-w-0">
																		<p className="truncate text-sm">
																			{file.fileName}
																		</p>
																		<p className="text-muted-foreground text-xs">
																			{(file.file.size / (1024 * 1024)).toFixed(
																				2,
																			)}{" "}
																			MB
																		</p>
																	</div>
																	<DropzoneRemoveFile
																		variant="ghost"
																		className="shrink-0 hover:outline"
																		onClick={() => {
																			const filteredPhotos = photoURLs.filter(
																				(photo) => photo.name !== file.fileName,
																			);

																			form.setValue(
																				"photoURLs",
																				filteredPhotos,
																			);

																			dropzone.onRemoveFile(file.id);
																		}}
																	>
																		<Trash2Icon className="size-4" />
																	</DropzoneRemoveFile>
																</div>
															</DropzoneFileListItem>
														))}
													</DropzoneFileList>
												</Dropzone>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								type="submit"
								className="sticky bottom-0 bg-green-700 hover:bg-green-700/90"
								disabled={isPosting}
							>
								{isPosting ? <Loader className="animate-spin" /> : null} Post
								Campaign
							</Button>
						</form>
					</Form>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}

interface EditCampaignFormProps {
	user: User | null;
	campaign: Campaign;
}

function EditCampaignForm({ user, campaign }: EditCampaignFormProps) {
	const { isEditCampaignOpen, setIsEditCampaignOpen } = useEditCampaignStore(
		shallow.useShallow((state) => ({
			isEditCampaignOpen: state.open,
			setIsEditCampaignOpen: state.setOpen,
		})),
	);

	const [isUpdating, setIsUpdating] = React.useState(false);
	const [time, setTime] = React.useState<string>("00:00");
	const [files, setFiles] = React.useState<File[]>([]);
	const dropzoneAreaRef = React.useRef<HTMLLabelElement>(null);

	const form = useForm<EditCampaignSchema>({
		resolver: zodResolver(editCampaignSchema),
		defaultValues: {
			id: campaign.id ?? crypto.randomUUID(),
			title: campaign.title ?? "Untitled",
			description: campaign.description
				? {
						...campaign.description,
						when: campaign.description.when.toDate(),
					}
				: {
						where: "",
						what: "",
						when: new Date(),
					},
			photoURLs: campaign.photoURLs.length ? campaign.photoURLs : [],
		},
	});

	const dropzone = useDropzone({
		onDropFile: async (file: File) => {
			const newFile = [...files, file];
			setFiles(newFile);

			await new Promise((resolve) => setTimeout(resolve, 1000));
			return {
				status: "success",
				result: URL.createObjectURL(file),
			};
		},
		shiftOnMaxFiles: true,
		validation: {
			accept: {
				"image/*": [".png", ".jpg", ".jpeg"],
			},
			maxSize: 10 * 1024 * 1024,
			maxFiles: 10,
		},
	});

	const handleOnUpdateCampaign = async (values: EditCampaignSchema) => {
		const campaignRef = firestore
			.doc(db, "campaigns", values.id)
			.withConverter(campaignConverter);
		setIsUpdating(true);
		const storageURLs = [];

		if (files.length >= 1) {
			for (let i = 0; i < files.length; i++) {
				const file = files[i] as File;
				const storageRef = ref(storage, `campaign_photos/${file.name}`);
				await uploadBytes(storageRef, file);
				const photoURL = await getDownloadURL(storageRef); // Get the URL after uploading
				storageURLs.push(photoURL);
			}
		}

		await firestore
			.updateDoc(campaignRef, {
				title: values.title,
				description: values.description,
				photoURLs: storageURLs.length
					? values.photoURLs.concat(storageURLs)
					: values.photoURLs,
			})

			.then(() => {
				toast.success("Campaign updated successfully.");
				setIsEditCampaignOpen(false);
				setIsUpdating(false);
			});
	};

	return (
		<Dialog
			open={isEditCampaignOpen}
			onOpenChange={(open) => {
				setIsEditCampaignOpen(open);
				form.reset();
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Campaign</DialogTitle>
					<DialogDescription>
						Please provide the necessary information to set up your new campaign
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="h-96">
					<Form {...form}>
						<form
							className="flex flex-col gap-4"
							onSubmit={form.handleSubmit(handleOnUpdateCampaign)}
						>
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>Campaign Title</FormLabel>
										<FormControl>
											<Input {...field} placeholder="Enter your title here" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description.when"
								render={({ field }) => (
									<FormItem>
										<FormLabel>When</FormLabel>
										<FormControl>
											<div className="flex w-full flex-col gap-4 sm:flex-row">
												<DatePicker
													triggerClassName="w-full md:w-fit"
													date={field.value}
													onValueChanged={(date) =>
														form.setValue("description.when", date)
													}
												/>

												<Select
													defaultValue={time!}
													onValueChange={(e) => {
														setTime(e);
														if (field.value) {
															const [hours, minutes] = e.split(":");
															const newDate = new Date(field.value.getTime());
															newDate.setHours(
																Number.parseInt(hours!),
																Number.parseInt(minutes!),
															);
															field.onChange(newDate);
														}
													}}
												>
													<SelectTrigger className="w-full shrink-0 font-normal focus:ring-0 focus:ring-offset-0 sm:w-[120px]">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<ScrollArea className="h-[15rem]">
															{Array.from({ length: 96 }).map((_, i) => {
																const hour = Math.floor(i / 4)
																	.toString()
																	.padStart(2, "0");
																const minute = ((i % 4) * 15)
																	.toString()
																	.padStart(2, "0");
																return (
																	<SelectItem
																		key={i}
																		value={`${hour}:${minute}`}
																	>
																		{hour}:{minute}
																	</SelectItem>
																);
															})}
														</ScrollArea>
													</SelectContent>
												</Select>
											</div>
										</FormControl>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description.where"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>Where</FormLabel>
										<FormControl>
											<Input {...field} placeholder="(e.g., location)" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description.what"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>What</FormLabel>
										<FormControl>
											<Input {...field} placeholder="(e.g., ML Tournament)" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="photoURLs"
								render={() => (
									<FormItem className="flex flex-col">
										<div className="flex items-center gap-2">
											{form.watch("photoURLs").length
												? form.watch("photoURLs").map((url) => (
														<div
															className="bg-secondary relative overflow-hidden rounded-md p-0 shadow-sm"
															key={url}
														>
															<img
																src={url}
																alt="Uploaded"
																className="size-28 rounded-md object-cover"
															/>
															<Button
																className="absolute top-2 right-2"
																variant="outline"
																size="icon"
																onClick={() => {
																	const filteredPhotos = form
																		.watch("photoURLs")
																		.filter((urlItem) => urlItem !== url);

																	form.setValue("photoURLs", filteredPhotos);
																}}
															>
																<Trash2Icon className="size-4" />
															</Button>
														</div>
													))
												: null}
										</div>

										<FormLabel>Images</FormLabel>
										<FormControl>
											<div className="not-prose flex flex-col gap-4">
												<Dropzone {...dropzone}>
													<div>
														<div className="flex justify-between">
															<DropzoneDescription>
																Please select up to 10 images
															</DropzoneDescription>
															<DropzoneMessage />
														</div>
														<DropZoneArea>
															<DropzoneTrigger
																ref={dropzoneAreaRef}
																className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm"
															>
																<CloudUploadIcon className="size-8" />
																<div>
																	<p className="font-semibold">Upload images</p>
																	<p className="text-muted-foreground text-sm">
																		Click here or drag and drop to upload
																	</p>
																</div>
															</DropzoneTrigger>
														</DropZoneArea>
													</div>

													<DropzoneFileList className="grid gap-3 p-0 md:grid-cols-2 lg:grid-cols-3">
														{dropzone.fileStatuses.map((file) => (
															<DropzoneFileListItem
																className="bg-secondary overflow-hidden rounded-md p-0 shadow-sm"
																key={file.id}
																file={file}
															>
																{file.status === "pending" && (
																	<div className="aspect-video animate-pulse bg-black/20" />
																)}
																{file.status === "success" && (
																	// eslint-disable-next-line @next/next/no-img-element
																	<img
																		src={file.result}
																		alt={`uploaded-${file.fileName}`}
																		className="aspect-video object-cover"
																	/>
																)}
																<div className="flex items-center justify-between p-2 pl-4">
																	<div className="min-w-0">
																		<p className="truncate text-sm">
																			{file.fileName}
																		</p>
																		<p className="text-muted-foreground text-xs">
																			{(file.file.size / (1024 * 1024)).toFixed(
																				2,
																			)}{" "}
																			MB
																		</p>
																	</div>
																	<DropzoneRemoveFile
																		variant="ghost"
																		className="shrink-0 hover:outline"
																		onClick={() => {
																			const filteredPhotos = files.filter(
																				(photo) => photo.name !== file.fileName,
																			);

																			setFiles(filteredPhotos);
																			dropzone.onRemoveFile(file.id);
																		}}
																	>
																		<Trash2Icon className="size-4" />
																	</DropzoneRemoveFile>
																</div>
															</DropzoneFileListItem>
														))}
													</DropzoneFileList>
												</Dropzone>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								type="submit"
								className="sticky bottom-0 bg-green-700 hover:bg-green-700/90"
								disabled={isUpdating}
							>
								{isUpdating ? <Loader className="animate-spin" /> : null} Update
								Campaign
							</Button>
						</form>
					</Form>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}

interface CampaignListProps {
	campaign: Campaign;
	participations: Participation[];
	user: User;
}

function CampaignList({ campaign, participations, user }: CampaignListProps) {
	const [isLoading, setIsLoading] = React.useState(false);
	const [isLightBoxOpen, setIsLightBoxOpen] = React.useState(false);
	const [isCommentDialogOpen, setIsCommentDialogOpen] = React.useState(false);
	const [current, setCurrent] = React.useState(0);
	const [frameTier, setFrameTier] = React.useState("unknown");
	const [rankImage, setRankImage] = React.useState("");
	const [isRankDialogOpen, setIsRankDialogOpen] = React.useState(false);
	const [type, setType] = React.useState<"promote" | "demote">("promote");
	const [comments, setComments] = React.useState<Comment[]>([]);
	const [shareCount, setShareCount] = React.useState(0);
	const [isVolunteerDialogOpened, setIsSetVolunteerDialogOpened] =
		React.useState(false);
	const currentCampaignId = useEditCampaignStore(
		(state) => state.currentCampaignId,
	);

	function handleOnImageClick(index: number) {
		setIsLightBoxOpen(true);
		setCurrent(index);
	}

	// Function to handle liking a campaign
	const handleOnLikeCampaign = async (campaignId: string) => {
		setIsLoading(true);
		const optionsRef = firestore
			.collection(db, "campaigns", campaignId, "points")
			.withConverter(pointsConverter);
		const campaignOptions = (
			await firestore.getDocs(optionsRef)
		).docs[0]!.data() as Points;

		try {
			const isCampaignLiked = campaign.likes?.some(
				(like) => like.uid === user?.uid && like.type === "like", // Check if the user has liked the campaign
			);

			// Find the like ID if the user has already liked the campaign
			const likeId = campaign.likes?.find((like) => like.uid === user?.uid)
				?.id!;

			// Check if the campaign has no likes
			if (campaign.likes?.length === 0 || !likeId) {
				// If the campaign has no likes, add a new like document
				const likeRef = firestore.collection(
					db,
					"campaigns",
					campaignId,
					"likes",
				);
				await firestore.addDoc(likeRef, { uid: user?.uid!, type: "like" });

				// Update user points based on campaign like points
				await firestore.updateDoc(firestore.doc(db, "users", user!.uid), {
					points: firestore.increment(campaignOptions.like),
				});

				// Update user's frame tier based on their new points total
				await updateFrameTier(firestore.doc(db, "users", user!.uid));
				setType("promote");

				toast.success(
					`You liked the campaign! You earned ${campaignOptions.like} points!`,
				);

				await addScoreLog("like", campaignOptions.like, user, campaignId);

				setIsLoading(false);

				window.location.reload();
				return;
			}

			const likeRef = firestore.doc(
				db,
				"campaigns",
				campaignId,
				"likes",
				likeId,
			);

			// If the user has already liked the campaign, change the like type to "dislike"
			if (isCampaignLiked) {
				await firestore.updateDoc(likeRef, { type: "dislike" });
				window.location.reload();
			} else {
				// Otherwise, change the like type to "like"
				await firestore.updateDoc(likeRef, { type: "like" });
				window.location.reload();
			}

			const isLikeDataExist = await firestore.getDoc(likeRef);

			// If the like document does not exist, create a new one
			if (!isLikeDataExist) {
				firestore.addDoc(
					firestore.collection(db, "campaigns", campaignId, "likes"),
					{
						uid: user?.uid!,
						type: "like",
					},
				);

				// Update user points based on campaign like points
				await firestore.updateDoc(firestore.doc(db, "users", user!.uid), {
					points: firestore.increment(campaignOptions.like),
				});

				// Update user's frame tier based on their new points total
				await updateFrameTier(firestore.doc(db, "users", user!.uid));
				setType("promote");

				toast.success(
					`You liked the campaign! You earned ${campaignOptions.like} points!`,
				);

				await addScoreLog("like", campaignOptions.like, user, campaignId);

				setIsLoading(false);

				window.location.reload();
				return;
			}

			setIsLoading(false);
		} catch (error) {
			toast.error("Error liking campaign. Please try again.");
			setIsLoading(false);
		}
	};

	// Function to handle sharing a campaign
	const handleOnShareCampaign = async (campaignId: string) => {
		setIsLoading(true);
		const optionsRef = firestore
			.collection(db, "campaigns", campaignId, "points")
			.withConverter(pointsConverter);
		const campaignOptions = (
			await firestore.getDocs(optionsRef)
		).docs[0]!.data() as Points;

		if (user) {
			try {
				const campaignRef = firestore.doc(db, "campaigns", campaignId);
				const campaignSnapshot = await firestore.getDoc(campaignRef);
				const campaignData = campaignSnapshot.data();

				// Log share to participation
				await firestore.addDoc(firestore.collection(db, "participation"), {
					campaignid: campaignId,
					uid: user.uid,
					displayName: user.displayName || "Anonymous",
					joinDate: firestore.serverTimestamp(),
					status: "shared",
				});

				// Award points based on campaign share points
				const userRef = firestore.doc(db, "users", user.uid);
				await firestore.updateDoc(userRef, {
					points: firestore.increment(campaignOptions.share),
				});
				await updateFrameTier(userRef);
				setType("promote");

				await addScoreLog("share", campaignOptions.share, user, campaignId);

				// Open the Facebook share dialog
				const url = `https://envirolink-seven.vercel.app/campaign/${campaignId}`;
				const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}?e=${encodeURIComponent(
					campaignData?.title ?? "",
				)}`;
				window.open(shareUrl, "_blank", "width=600,height=400");

				toast.success(
					`Campaign shared successfully and earned ${campaignOptions.share} points!`,
				);
				setIsLoading(false);
			} catch (error) {
				console.error("Error sharing campaign:", error);
				toast.error("Error sharing campaign. Please try again.");
				setIsLoading(false);
			}
		} else {
			toast.error("You must be logged in to share a campaign.");
			setIsLoading(false);
		}
	};

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

	// Helper function to update frame tier
	async function updateFrameTier(userRef: firestore.DocumentReference) {
		const userSnap = await firestore.getDoc(userRef);
		const rankRef = firestore
			.collection(db, "rankDescription")
			.withConverter(rankDescriptionConverter);
		const q = firestore.query(rankRef, firestore.orderBy("points", "desc"));
		const ranks = (await firestore.getDocs(q)).docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		}));

		if (userSnap.exists()) {
			const points = userSnap.data().points || 0;

			for (const rank of ranks) {
				if (
					(ranks[ranks.length - 1]?.points as number) > points &&
					userSnap.data().frameTier.length >= 1
				) {
					const name = await firestore
						.updateDoc(userRef, {
							frameTier: "",
						})
						.then(() => {
							setFrameTier("");
							setRankImage("");
							setIsRankDialogOpen(true);
							return rank.name;
						});

					if (name.length < 1) break;
				}

				if (points >= rank.points) {
					if (userSnap.data().frameTier !== rank.name) {
						const name = await firestore
							.updateDoc(userRef, {
								frameTier: rank.name,
							})
							.then(() => {
								setFrameTier(rank.name);
								setRankImage(rank.image);
								setIsRankDialogOpen(true);
								return rank.name;
							});

						if (name === rank.name) break;
					}

					if (userSnap.data().frameTier === rank.name) break;
				}
			}
		}
	}

	// Function to get the count of likes for a campaign
	function getLikesCount() {
		return campaign.likes?.filter((like) => like.type === "like").length ?? 0;
	}

	// Effect to listen for changes in campaign comments and update state
	React.useEffect(() => {
		const campaignRef = firestore.doc(db, "campaigns", campaign.id);
		const commentsRef = firestore
			.collection(db, "comments")
			.withConverter(commentConverter);
		const commentsQuery = firestore.query(
			commentsRef,
			firestore.where("campaignRef", "==", campaignRef),
			firestore.orderBy("timestamp", "desc"),
		);
		const unsub = firestore.onSnapshot(commentsQuery, async (snapshot) => {
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
		const participationRef = firestore
			.collection(db, "participation")
			.withConverter(participationConverter);
		const shareCountQuery = firestore.query(
			participationRef,
			firestore.where("campaignid", "==", campaign.id),
			firestore.where("status", "==", "shared"),
		);
		const unsub = firestore.onSnapshot(shareCountQuery, (snapshot) => {
			setShareCount(snapshot.size);
		});

		return () => unsub();
	}, [campaign.id]);

	return (
		<TooltipProvider disableHoverableContent delayDuration={500}>
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

							<div className="flex items-center gap-2">
								<Badge
									className={cn("cursor-pointer")}
									variant={campaign.isDone ? "outline" : "default"}
								>
									{campaign.isDone
										? "Done"
										: campaign.description.when.toDate() <= new Date()
											? "Ongoing"
											: "New"}
								</Badge>
								{campaign.managerUid === user?.uid && !campaign.isDone ? (
									<CampaignDropdownMenu campaign={campaign} />
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

						{campaign.id !== currentCampaignId ||
						campaign.isDone ||
						user?.uid !== campaign.managerUid ? null : (
							<VolunteerAttendanceDialog
								participations={participations.filter(
									(participation) => participation.campaignid === campaign.id,
								)}
								campaign={campaign}
							/>
						)}

						{currentCampaignId === campaign.id && (
							<EditCampaignForm user={user} campaign={campaign} />
						)}

						<CampaignLightBoxDialog
							open={isLightBoxOpen}
							onOpenChange={setIsLightBoxOpen}
							photoURLs={campaign.photoURLs}
							activeIndex={current}
						/>

						<CommentsDialog
							campaignId={campaign.id}
							user={user}
							open={isCommentDialogOpen}
							onOpenChange={setIsCommentDialogOpen}
						/>

						<RankBadgeDialog
							open={isRankDialogOpen}
							onOpenChange={setIsRankDialogOpen}
							frameTier={frameTier}
							rankImage={rankImage}
							type={type}
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
							className={cn("w-full grow cursor-pointer sm:w-auto", {
								"text-primary hover:text-primary": campaign.likes?.some(
									(like) => like.uid === user?.uid && like.type === "like", // Check if the user has liked the campaign
								),
							})}
							variant="ghost"
							onClick={() => void handleOnLikeCampaign(campaign.id)}
							disabled={isLoading}
						>
							<ThumbsUpIcon /> Like
						</Button>
						<Button
							className="w-full grow cursor-pointer sm:w-auto"
							variant="ghost"
							onClick={() => setIsCommentDialogOpen(true)}
						>
							<MessageCircleIcon /> Comment
						</Button>

						<Button
							className="w-full grow cursor-pointer sm:w-auto"
							variant="ghost"
							onClick={() => void handleOnShareCampaign(campaign.id)}
						>
							<Share2Icon /> Share
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
													{comment.rankImage.length > 0 ? (
														<img
															className="size-4"
															src={comment.rankImage}
															alt={comment.displayName}
														/>
													) : null}
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
		</TooltipProvider>
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
	user: User;
	onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
	campaignId: string;
}

function CommentsDialog({
	open,
	user,
	onOpenChange,
	campaignId,
}: CommentsDialogProps) {
	const [comments, setComments] = React.useState<Comment[]>([]);
	const [isSending, setIsSending] = React.useState(false);
	const [isFetching, setIsFetching] = React.useState(false);
	const [comment, setComment] = React.useState("");
	const [frameTier, setFrameTier] = React.useState("");
	const [rankImage, setRankImage] = React.useState("");
	const [isRankDialogOpen, setIsRankDialogOpen] = React.useState(false);
	const [type, setType] = React.useState<"promote" | "demote">("promote");

	const handleOnSendComment = async () => {
		setIsSending(true);
		const pointsRef = firestore
			.collection(db, "campaigns", campaignId, "points")
			.withConverter(pointsConverter);
		const campaignOptions = (
			await firestore.getDocs(pointsRef)
		).docs[0]!.data() as Points;

		const frameTier = await firestore
			.getDoc(
				firestore
					.doc(db, "users", user?.uid ?? "")
					.withConverter(userConverter),
			)
			.then((doc) => doc.data()!.frameTier);

		const rankRef = firestore
			.collection(db, "rankDescription")
			.withConverter(rankDescriptionConverter);
		const q = firestore.query(rankRef, firestore.orderBy("points", "desc"));
		const ranks = (await firestore.getDocs(q)).docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		}));

		let rankImage = "";
		for (const rank of ranks) {
			if (user.points >= rank.points) {
				rankImage += rank.image;
				break;
			}
		}

		if (user) {
			try {
				const campaignRef = firestore.doc(db, "campaigns", campaignId);

				const commentData = {
					comment,
					displayName: user.displayName || "Anonymous",
					timestamp: firestore.serverTimestamp(),
					uid: user.uid,
					campaignRef: campaignRef,
					userPhotoURL: user.profilepictureURL,
					frameTier,
					rankImage,
				};

				// Add the comment to the 'comments' collection
				await firestore.addDoc(
					firestore.collection(db, "comments"),
					commentData,
				);

				// Award points based on campaign comment points
				const userRef = firestore.doc(db, "users", user.uid);
				await firestore.updateDoc(userRef, {
					points: firestore.increment(campaignOptions.comment),
				});
				await updateFrameTier(userRef);
				setType("promote");

				await addScoreLog("comment", campaignOptions.comment, user, campaignId);

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

	// Helper function to update frame tier
	async function updateFrameTier(userRef: firestore.DocumentReference) {
		const userSnap = await firestore.getDoc(userRef);
		const rankRef = firestore
			.collection(db, "rankDescription")
			.withConverter(rankDescriptionConverter);
		const q = firestore.query(rankRef, firestore.orderBy("points", "desc"));
		const ranks = (await firestore.getDocs(q)).docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		}));

		if (userSnap.exists()) {
			const points = userSnap.data().points || 0;

			for (const rank of ranks) {
				if (
					(ranks[ranks.length - 1]?.points as number) > points &&
					userSnap.data().frameTier.length >= 1
				) {
					const name = await firestore
						.updateDoc(userRef, {
							frameTier: "",
						})
						.then(() => {
							setFrameTier("");
							setRankImage("");
							setIsRankDialogOpen(true);
							return rank.name;
						});

					if (name.length < 1) break;
				}

				if (points >= rank.points) {
					if (userSnap.data().frameTier !== rank.name) {
						const name = await firestore
							.updateDoc(userRef, {
								frameTier: rank.name,
							})
							.then(() => {
								setFrameTier(rank.name);
								setRankImage(rank.image);
								setIsRankDialogOpen(true);
								return rank.name;
							});

						if (name === rank.name) break;
					}

					if (userSnap.data().frameTier === rank.name) break;
				}
			}
		}
	}

	// Effect to handle real-time updates to comments collection
	React.useEffect(() => {
		setIsFetching(true);
		const commentsCollection = firestore
			.collection(db, "comments")
			.withConverter(commentConverter);

		const commentsQuery = firestore.query(
			commentsCollection,
			firestore.orderBy("timestamp", "desc"),
			firestore.where(
				"campaignRef",
				"==",
				firestore.doc(db, "campaigns", campaignId),
			),
		);

		const unsub = firestore.onSnapshot(commentsQuery, (snapshot) => {
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
														{comment.rankImage.length >= 1 && (
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

				<RankBadgeDialog
					frameTier={frameTier}
					rankImage={rankImage}
					open={isRankDialogOpen}
					onOpenChange={setIsRankDialogOpen}
					type={type}
				/>
			</DialogContent>
		</Dialog>
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
					<DialogTitle>
						{type === "promote" ? "Congratulations 🎉" : "Demoted 😔"}
					</DialogTitle>
					<DialogDescription></DialogDescription>
				</DialogHeader>
				<div className="flex flex-col items-center justify-center text-center">
					{rankImage.length >= 1 && (
						<div className="relative w-40">
							<AspectRatio ratio={1 / 1}>
								<img
									className="size-full object-cover"
									src={rankImage}
									alt="frame tier"
								/>
							</AspectRatio>
						</div>
					)}
					{type === "promote"
						? "You have been promoted to the"
						: "You have been demoted to the"}
					<span className="font-bold">
						{frameTier.length >= 1
							? frameTier.charAt(0).toUpperCase() + frameTier.slice(1)
							: "Unranked"}
					</span>{" "}
					{frameTier.length >= 1 && " Tier "}
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
