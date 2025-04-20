"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Participation } from "@/types";

import { format } from "date-fns";

interface VolunteerListProps {
  volunteer: Participation;
}

export default function VolunteerList({ volunteer }: VolunteerListProps) {
  return (
    <ScrollArea className="max-h-80 w-full">
      <Card className="w-full">
        <CardContent className="flex flex-row items-center justify-between">
          <div className="space-y-2">
            <CardTitle>{volunteer.displayName}</CardTitle>
            <CardDescription>
              {format(
                volunteer.joindate.toDate() ?? new Date(),
                "MMM dd, yyyy 'at' hh:mm aaaa",
              )}
            </CardDescription>
          </div>
          <Badge variant="outline">{volunteer.status}</Badge>
        </CardContent>
      </Card>
    </ScrollArea>
  );
}
