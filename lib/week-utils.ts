import { DAY_ORDER, type DayId } from "./checklist-data";

export type CycleContext = {
  cycleYear: number;
  cycleMonth: number;
  firstMonday: Date;
  rawWeek: number;
  currentWeek: number;
  weekStart: Date;
  weekDates: Record<DayId, Date>;
  activeDay: DayId;
};

const DAY_INDEX_TO_ID: Record<number, DayId> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday"
};

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getFirstMonday(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const day = firstOfMonth.getDay();
  const distance = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  return addDays(firstOfMonth, distance);
}

function buildWeekDates(weekStart: Date) {
  return DAY_ORDER.reduce<Record<DayId, Date>>((acc, dayId, index) => {
    acc[dayId] = addDays(weekStart, index);
    return acc;
  }, {} as Record<DayId, Date>);
}

export function getCycleContext(inputDate = new Date()): CycleContext {
  const today = startOfDay(inputDate);
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstMonday = getFirstMonday(year, month);

  if (today < firstMonday) {
    return getCycleContext(new Date(year, month, 0));
  }

  const diffDays = Math.floor(
    (today.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24)
  );
  const rawWeek = Math.floor(diffDays / 7);
  const currentWeek = (rawWeek % 4) + 1;
  const weekStart = addDays(firstMonday, rawWeek * 7);

  return {
    cycleYear: year,
    cycleMonth: month,
    firstMonday,
    rawWeek,
    currentWeek,
    weekStart,
    weekDates: buildWeekDates(weekStart),
    activeDay: DAY_INDEX_TO_ID[today.getDay()]
  };
}

export function getWeekStartForSelection(context: CycleContext, week: number) {
  const normalizedOffset = (context.currentWeek - week + 4) % 4;
  const targetRawWeek = Math.max(0, context.rawWeek - normalizedOffset);
  return addDays(context.firstMonday, targetRawWeek * 7);
}

export function getWeekDatesForSelection(context: CycleContext, week: number) {
  return buildWeekDates(getWeekStartForSelection(context, week));
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric"
  }).format(date);
}
