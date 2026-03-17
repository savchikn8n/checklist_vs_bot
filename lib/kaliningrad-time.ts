import type { DayId } from "./checklist-data";

const TIME_ZONE = "Europe/Kaliningrad";

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

const INDEX_TO_DAY_ID: Record<number, DayId> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday"
};

type KaliningradParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekdayIndex: number;
};

export type OperationalChecklistTime = {
  localDate: Date;
  effectiveDate: Date;
  currentLocalDayId: DayId;
  effectiveDayId: DayId;
  cutoffHour: number;
  warningHour: number;
  isAfterWarningThreshold: boolean;
  isBeforeCutoff: boolean;
};

function getKaliningradParts(date = new Date()): KaliningradParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekdayIndex: WEEKDAY_TO_INDEX[get("weekday")] ?? 0
  };
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getCutoffHour(weekdayIndex: number) {
  return weekdayIndex === 5 || weekdayIndex === 6 ? 4 : 3;
}

function getWarningHour(weekdayIndex: number) {
  return weekdayIndex === 5 || weekdayIndex === 6 ? 2 : 1;
}

export function getOperationalChecklistTime(date = new Date()): OperationalChecklistTime {
  const parts = getKaliningradParts(date);
  const localDate = new Date(parts.year, parts.month - 1, parts.day);
  const cutoffHour = getCutoffHour(parts.weekdayIndex);
  const warningHour = getWarningHour(parts.weekdayIndex);
  const isBeforeCutoff = parts.hour < cutoffHour;
  const effectiveDate = isBeforeCutoff ? addDays(localDate, -1) : localDate;

  return {
    localDate,
    effectiveDate,
    currentLocalDayId: INDEX_TO_DAY_ID[parts.weekdayIndex],
    effectiveDayId: INDEX_TO_DAY_ID[effectiveDate.getDay()],
    cutoffHour,
    warningHour,
    isAfterWarningThreshold: parts.hour >= warningHour,
    isBeforeCutoff
  };
}

export function formatDateForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
