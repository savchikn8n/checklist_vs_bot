"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CHECKLIST_DAYS,
  DAY_LABELS,
  WEEK_OPTIONS,
  type ChecklistTask,
  type DayId
} from "../lib/checklist-data";
import {
  formatDate,
  formatMonth,
  getCycleContext,
  getWeekDatesForSelection
} from "../lib/week-utils";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
      };
    };
  }
}

type CompletionMap = Record<string, boolean>;

const STORAGE_PREFIX = "checklist-progress";

function getStorageKey(
  cycleYear: number,
  cycleMonth: number,
  selectedWeek: number,
  selectedDay: DayId
) {
  return `${STORAGE_PREFIX}:${cycleYear}-${cycleMonth + 1}:week-${selectedWeek}:${selectedDay}`;
}

function sortTasks(tasks: ChecklistTask[]) {
  return [...tasks];
}

export function ChecklistApp() {
  const context = useMemo(() => getCycleContext(), []);
  const [selectedWeek, setSelectedWeek] = useState<number>(context.currentWeek);
  const [selectedDay, setSelectedDay] = useState<DayId>(context.activeDay);
  const [completed, setCompleted] = useState<CompletionMap>({});
  const [loadedStorageKey, setLoadedStorageKey] = useState("");

  const selectedWeekDates = useMemo(
    () => getWeekDatesForSelection(context, selectedWeek),
    [context, selectedWeek]
  );

  const currentDay = useMemo(
    () => CHECKLIST_DAYS.find((day) => day.id === selectedDay) ?? CHECKLIST_DAYS[0],
    [selectedDay]
  );

  const activeTasks = useMemo(
    () => sortTasks(currentDay.tasks.filter((task) => !task.offWeeks.includes(selectedWeek))),
    [currentDay.tasks, selectedWeek]
  );

  const skippedTasks = useMemo(
    () => sortTasks(currentDay.tasks.filter((task) => task.offWeeks.includes(selectedWeek))),
    [currentDay.tasks, selectedWeek]
  );

  const progress = activeTasks.length
    ? activeTasks.filter((task) => completed[task.id]).length / activeTasks.length
    : 1;

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();
    webApp?.setHeaderColor?.("#f3efe6");
    webApp?.setBackgroundColor?.("#f3efe6");
  }, []);

  useEffect(() => {
    const key = getStorageKey(
      context.cycleYear,
      context.cycleMonth,
      selectedWeek,
      selectedDay
    );
    const raw = window.localStorage.getItem(key);
    setCompleted(raw ? (JSON.parse(raw) as CompletionMap) : {});
    setLoadedStorageKey(key);
  }, [context.cycleMonth, context.cycleYear, selectedDay, selectedWeek]);

  useEffect(() => {
    const key = getStorageKey(
      context.cycleYear,
      context.cycleMonth,
      selectedWeek,
      selectedDay
    );

    if (loadedStorageKey !== key) {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(completed));
  }, [
    completed,
    context.cycleMonth,
    context.cycleYear,
    loadedStorageKey,
    selectedDay,
    selectedWeek
  ]);

  function toggleTask(taskId: string) {
    setCompleted((current) => ({
      ...current,
      [taskId]: !current[taskId]
    }));
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Telegram Mini App</p>
        <h1>Чеклист смены</h1>
        <p className="hero-copy">
          Текущий цикл: {selectedWeek}-я неделя, {DAY_LABELS[selectedDay].toLowerCase()}.
        </p>
        <div className="hero-meta">
          <div>
            <span>Месяц цикла</span>
            <strong>
              {formatMonth(
                new Date(context.cycleYear, context.cycleMonth, 1)
              )}
            </strong>
          </div>
          <div>
            <span>Дата дня</span>
            <strong>{formatDate(selectedWeekDates[selectedDay])}</strong>
          </div>
          <div>
            <span>Прогресс</span>
            <strong>{Math.round(progress * 100)}%</strong>
          </div>
        </div>
        <div className="progress-bar" aria-hidden="true">
          <div className="progress-bar__value" style={{ width: `${progress * 100}%` }} />
        </div>
      </section>

      <section className="controls-card">
        <div className="control-group">
          <span className="control-title">Неделя цикла</span>
          <div className="chip-row">
            {WEEK_OPTIONS.map((week) => (
              <button
                key={week}
                className={week === selectedWeek ? "chip chip--active" : "chip"}
                onClick={() => setSelectedWeek(week)}
                type="button"
              >
                {week} неделя
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <span className="control-title">День недели</span>
          <div className="chip-row">
            {CHECKLIST_DAYS.map((day) => (
              <button
                key={day.id}
                className={day.id === selectedDay ? "chip chip--active" : "chip"}
                onClick={() => setSelectedDay(day.id)}
                type="button"
              >
                {day.shortTitle}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="tasks-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Активные задачи</p>
            <h2>{currentDay.title}</h2>
          </div>
          <span className="section-date">{formatDate(selectedWeekDates[selectedDay])}</span>
        </div>

        {activeTasks.length ? (
          <div className="task-list">
            {activeTasks.map((task, index) => (
              <label className="task-item" key={task.id}>
                <input
                  checked={Boolean(completed[task.id])}
                  onChange={() => toggleTask(task.id)}
                  type="checkbox"
                />
                <span className="task-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="task-text">{task.text}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="empty-state">На этот день нет активных задач.</p>
        )}
      </section>

      <section className="tasks-card tasks-card--muted">
        <div className="section-head">
          <div>
            <p className="section-kicker">Не требуется на этой неделе</p>
            <h2>Скрытые задачи по матрице</h2>
          </div>
        </div>

        {skippedTasks.length ? (
          <ul className="muted-list">
            {skippedTasks.map((task) => (
              <li key={task.id}>{task.text}</li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">Для этого дня все задачи активны.</p>
        )}
      </section>
    </main>
  );
}
