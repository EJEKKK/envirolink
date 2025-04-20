"use client";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { db } from "@/config/firebase";
import {
  type RankDescriptionFormSchema,
  rankDescriptionFormSchema,
} from "./_lib/validations";

import { zodResolver } from "@hookform/resolvers/zod";
import { doc, setDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

export default function RankDescription() {
  const form = useForm<RankDescriptionFormSchema>({
    resolver: zodResolver(rankDescriptionFormSchema),
    defaultValues: {
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    },
  });
  const [isPending, setIsPending] = React.useState(false);

  const handleOnSetRankDescription = async (
    values: RankDescriptionFormSchema,
  ) => {
    setIsPending(true);
    await Promise.all([
      await setDoc(doc(db, "rankDescription", "silver"), {
        points: values.silver,
      }),
      await setDoc(doc(db, "rankDescription", "gold"), {
        points: values.gold,
      }),
      await setDoc(doc(db, "rankDescription", "platinum"), {
        points: values.platinum,
      }),
      await setDoc(doc(db, "rankDescription", "diamond"), {
        points: values.diamond,
      }),
    ])
      .catch((err) => {
        toast.error("Failed to update rank description!", {
          richColors: true,
          description: err.message,
        });
        setIsPending(false);
      })
      .finally(() => {
        toast.success("Rank description updated successfully!");
        setIsPending(false);
      });
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <h4 className="text-lg font-semibold">Rank Description</h4>
        </div>
      </header>
      <main className="mt-4 p-4">
        <Form {...form}>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(handleOnSetRankDescription)}
          >
            <FormField
              control={form.control}
              name="silver"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Silver Points</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      placeholder="Enter your points"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gold Points</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      placeholder="Enter your points"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="platinum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platinun Points</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      placeholder="Enter your points"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="diamond"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diamond Points</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      placeholder="Enter your points"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end md:col-span-2">
              <Button
                type="submit"
                className="w-full md:w-fit"
                disabled={isPending}
              >
                {isPending && <Loader2Icon className="animate-spin" />} Save
                changes
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </>
  );
}
