"use client";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

type DatePickerProps = {
	triggerClassName?: string;
	date: Date;
	onValueChanged: (date: Date) => void;
};

export default function DatePicker({
	triggerClassName,
	date,
	onValueChanged,
}: DatePickerProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant={"outline"}
					className={cn(
						"w-[240px] justify-start text-left font-normal",
						!date && "text-muted-foreground",
						triggerClassName
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{date ? format(date, "PPP") : <span>Pick a date</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={date}
					onSelect={(date) => onValueChanged(date)}
					autoFocus
					required
				/>
			</PopoverContent>
		</Popover>
	);
}
