"use client";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

type DatePickerProps = {
  triggerClassName?: string;
  date?: DateRange;
  onValueChanged: (date: DateRange) => void;
  placeholder?: string;
};

export default function DateRangePicker({
  triggerClassName,
  date,
  onValueChanged,
  placeholder,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "LLL dd, y")} -{" "}
                {format(date.to, "LLL dd, y")}
              </>
            ) : (
              format(date.from, "LLL dd, y")
            )
          ) : (
            <span>
              {(placeholder?.length as number) >= 1
                ? placeholder
                : "Pick a date"}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          className="w-fit"
          style={{ width: "auto" }}
          mode="range"
          selected={date}
          onSelect={(date) => onValueChanged(date)}
          defaultMonth={date?.from}
          autoFocus
          required
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
