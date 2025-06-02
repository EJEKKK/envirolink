"use client";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropZoneArea,
	Dropzone,
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
import { db, storage } from "@/config/firebase";
import { useIsClient } from "@/hooks/use-is-client";
import type { RankDescription } from "@/types";
import {
	type EditRankDescriptionFormSchema,
	editRankDescriptionFormSchema,
} from "../_lib/validations";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	addDoc,
	collection,
	doc,
	serverTimestamp,
	updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
	CloudUploadIcon,
	Edit2Icon,
	Loader2Icon,
	Trash2Icon,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Skeleton } from "@/components/ui/skeleton";

interface EditRankDescriptionProps {
	rank: RankDescription;
}

export default function EditRankDialog({ rank }: EditRankDescriptionProps) {
	const form = useForm<EditRankDescriptionFormSchema>({
		resolver: zodResolver(editRankDescriptionFormSchema),
		defaultValues: {
			id: rank.id ?? "",
			name: rank.name ?? "",
			points: rank.points ?? 0,
			image: rank.image ?? [],
			file: [],
		},
	});
	const imageFile = useWatch({ control: form.control, name: "file" });

	const [isEditRankDialogOpen, setIsEditRankDialogOpen] = React.useState(false);
	const [isUpdating, setIsUpdating] = React.useState(false);
	const isClient = useIsClient();

	const dropzone = useDropzone({
		onDropFile: async (file) => {
			form.setValue("file", [file]);
			await new Promise((resolve) => setTimeout(resolve, 500));
			return {
				status: "success",
				result: URL.createObjectURL(file),
			};
		},
		validation: {
			accept: {
				"image/*": [".png", ".jpg", ".jpeg"],
			},
			maxSize: 1024 * 1024 * 5, // 5MB
			maxFiles: 1,
		},
	});

	const handleOnUpdateRank = async (values: EditRankDescriptionFormSchema) => {
		setIsUpdating(true);
		const rankRef = doc(db, "rankDescription", rank.id);
		const rankImageRef = ref(storage, `ranks/${values.name}-${Date.now()}`);

		await uploadBytes(rankImageRef, imageFile[0] as File).then(
			async (snapshot) => {
				const fileURL = await getDownloadURL(snapshot.ref);

				await updateDoc(rankRef, {
					name: values.name,
					points: values.points,
					image: values.file.length >= 1 ? fileURL : values.image,
				});
				form.reset();
				setIsUpdating(false);
				setIsEditRankDialogOpen(false);
			},
		);
	};

	return (
		<Dialog
			open={isEditRankDialogOpen}
			onOpenChange={(open) => {
				if (!open) {
					form.reset();
					dropzone.fileStatuses.length = 0;
				}

				setIsEditRankDialogOpen(open);
			}}
		>
			<DialogTrigger asChild>
				<Button className="w-full">
					<Edit2Icon /> Edit Rank
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Rank</DialogTitle>
					<DialogDescription>
						Edit rank description for your application.
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="h-full max-h-96">
					<Form {...form}>
						<form className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input {...field} placeholder="Enter rank name" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="points"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Points</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={1}
												{...field}
												placeholder="Enter rank points"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="image"
								render={() => (
									<FormItem>
										<FormLabel>Image</FormLabel>
										<FormControl>
											<Dropzone {...dropzone}>
												<DropzoneMessage />
												<DropZoneArea>
													<DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm">
														<CloudUploadIcon className="size-8" />
														<div>
															<p className="font-semibold">
																Upload listing images
															</p>
															<p className="text-muted-foreground text-sm">
																Click here or drag and drop to upload
															</p>
														</div>
													</DropzoneTrigger>
												</DropZoneArea>

												<DropzoneFileList className="flex w-full gap-3 p-0">
													{dropzone.fileStatuses.map((file) => (
														<DropzoneFileListItem
															className="bg-secondary relative flex w-40 flex-col overflow-hidden rounded-md p-0 shadow-sm"
															key={file.id}
															file={file}
														>
															{file.status === "pending" && (
																<Skeleton className="bg-background/20 aspect-video animate-pulse" />
															)}
															{file.status === "success" && (
																// eslint-disable-next-line @next/next/no-img-element
																<img
																	src={file.result}
																	alt={`uploaded-${file.fileName}`}
																	className="object-cover"
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
																	onPointerDown={() => {
																		form.setValue(
																			"file",
																			imageFile.filter((f) => f !== file.file),
																		);
																	}}
																>
																	<Trash2Icon className="size-4" />
																</DropzoneRemoveFile>
															</div>
														</DropzoneFileListItem>
													))}
												</DropzoneFileList>
											</Dropzone>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</form>
					</Form>
				</ScrollArea>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="ghost" disabled={isUpdating}>
							Close
						</Button>
					</DialogClose>
					<Button
						type="button"
						onClick={form.handleSubmit(handleOnUpdateRank)}
						disabled={
							isUpdating ||
							(!form.formState.isDirty && form.watch("file").length === 0)
						}
					>
						{isUpdating && <Loader2Icon className="animate-spin" />} Save
						changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
