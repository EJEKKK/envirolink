"use client";
import * as React from "react";

import { type FileWithPreview, ImageCropper } from "@/components/image-cropper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db, storage } from "@/config/firebase";
import { userConverter } from "@/lib/utils";
import { type ProfileSchema, profileSchema } from "@/lib/validations";
import type { User } from "@/types";

import { zodResolver } from "@hookform/resolvers/zod";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { UserIcon } from "lucide-react";
import { type FileWithPath, useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const accept = {
  "image/*": [],
};

interface EditProfileDialogProps {
  user: User | null;
}

export default function EditProfileDialog({ user }: EditProfileDialogProps) {
  const form = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      profilePic: "",
    },
  });

  const [selectedFile, setSelectedFile] =
    React.useState<FileWithPreview | null>(null);
  const [isImageCropOpen, setIsImageCropOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const onDrop = React.useCallback(
    (acceptedFiles: FileWithPath[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        alert("Selected image is too large!");
        return;
      }

      const fileWithPreview = Object.assign(file, {
        preview: URL.createObjectURL(file),
      });

      setSelectedFile(fileWithPreview);
      setIsImageCropOpen(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept,
  });

  // Function to upload an image and return its URL
  async function uploadImage(file: File, path: string) {
    if (!file) return null;

    try {
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  }

  const onUpdateProfile = async (value: ProfileSchema) => {
    setIsUpdating(true);
    const userRef = doc(db, "users", user!.uid).withConverter(userConverter);

    if (selectedFile) {
      await uploadImage(selectedFile, `profile/${user!.uid}-profile`).then(
        async (url) => {
          if (url) {
            await updateDoc(userRef, {
              displayName: value.displayName,
              bio: value.bio,
              profilepictureURL: url,
            })
              .finally(() => {
                toast.success("Profile updated successfully");
                setIsUpdating(false);
              })
              .catch(() => {
                toast.error("Error updating profile. Please try again.");
                setIsUpdating(false);
              });
          }
        },
      );

      return;
    }

    await updateDoc(userRef, {
      displayName: value.displayName,
      bio: value.bio,
    })
      .finally(() => {
        toast.success("Profile updated successfully");
        setIsUpdating(false);
      })
      .catch(() => {
        toast.error("Error updating profile. Please try again.");
        setIsUpdating(false);
      });
  };

  React.useEffect(() => {
    if (user) {
      form.setValue("displayName", user.displayName);
      form.setValue("bio", user.bio ?? "");
      form.setValue("profilePic", user.profilepictureURL);
    }
  }, [form.setValue, user]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={!user}>Edit Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information below. You can change your profile
            picture, name, and bio.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(onUpdateProfile)}
          >
            <FormField
              control={form.control}
              name="profilePic"
              render={() => (
                <FormItem>
                  <FormLabel>Profile Picture</FormLabel>
                  <FormControl>
                    <div className="flex w-full justify-center">
                      {selectedFile ? (
                        <ImageCropper
                          selectedFile={selectedFile}
                          setSelectedFile={setSelectedFile}
                          dialogOpen={isImageCropOpen}
                          setDialogOpen={setIsImageCropOpen}
                        />
                      ) : (
                        <Avatar
                          {...getRootProps()}
                          className="size-36 cursor-pointer ring-2 ring-slate-200 ring-offset-2"
                        >
                          <input {...getInputProps()} />
                          <AvatarImage
                            src={user?.profilepictureURL ?? ""}
                            alt="profile picture"
                          />
                          <AvatarFallback>
                            <UserIcon />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter your name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter your bio here..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isUpdating}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={form.handleSubmit(onUpdateProfile)}
            disabled={isUpdating}
          >
            {isUpdating ? "Updating profile..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
