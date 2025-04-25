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
import {
  type RankDescriptionFormSchema,
  rankDescriptionFormSchema,
} from "../_lib/validations";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  CloudUploadIcon,
  Loader2Icon,
  PlusCircleIcon,
  Trash2Icon,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

export default function CreateRankDialog() {
  const form = useForm<RankDescriptionFormSchema>({
    resolver: zodResolver(rankDescriptionFormSchema),
    defaultValues: {
      name: "",
      points: 1,
      image: [],
    },
  });
  const imageFile = useWatch({ control: form.control, name: "image" });

  const [isCreateRankDialogOpen, setIsCreateRankDialogOpen] =
    React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  const dropzone = useDropzone({
    onDropFile: async (file) => {
      form.setValue("image", [file]);
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

  const handleOnCreateRank = async (values: RankDescriptionFormSchema) => {
    setIsCreating(true);
    const rankRef = collection(db, "rankDescription");
    const rankImageRef = ref(storage, `ranks/${values.name}-${Date.now()}`);

    await uploadBytes(rankImageRef, imageFile[0] as File).then(
      async (snapshot) => {
        const fileURL = await getDownloadURL(snapshot.ref);

        await addDoc(rankRef, {
          name: values.name,
          points: values.points,
          image: fileURL,
          createdAt: serverTimestamp(),
        });
        setIsCreating(false);
        setIsCreateRankDialogOpen(false);
      },
    );
  };

  return (
    <Dialog
      open={isCreateRankDialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
          dropzone.fileStatuses.length = 0;
        }

        setIsCreateRankDialogOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button className="hidden md:flex">
          <PlusCircleIcon /> Create new rank badge
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Rank</DialogTitle>
          <DialogDescription>
            Create a new rank description for your application.
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

                        <DropzoneFileList className="flex gap-3 p-0">
                          {dropzone.fileStatuses.map((file) => (
                            <DropzoneFileListItem
                              className="bg-secondary w-40 overflow-hidden rounded-md p-0 shadow-sm"
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
                                  onPointerDown={() => {
                                    form.setValue(
                                      "image",
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
            <Button variant="ghost" disabled={isCreating}>
              Close
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={form.handleSubmit(handleOnCreateRank)}
            disabled={isCreating}
          >
            {isCreating && <Loader2Icon className="animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
