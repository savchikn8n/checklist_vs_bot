"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  DAY_LABELS,
  WEEK_OPTIONS,
  type ChecklistTemplate,
  type ChecklistTemplateTask,
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

function sortTasks(tasks: ChecklistTemplateTask[]) {
  return [...tasks];
}

export function ChecklistApp() {
  const context = useMemo(() => getCycleContext(), []);
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [templateStatus, setTemplateStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedWeek, setSelectedWeek] = useState<number>(context.currentWeek);
  const [selectedDay, setSelectedDay] = useState<DayId>(context.activeDay);
  const [completed, setCompleted] = useState<CompletionMap>({});
  const [administrator, setAdministrator] = useState<string | null>(null);
  const [administratorStatus, setAdministratorStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [administratorDebug, setAdministratorDebug] = useState<string | null>(null);
  const [confettiBurstKey, setConfettiBurstKey] = useState(0);
  const [progressStatus, setProgressStatus] = useState<"idle" | "loading" | "ready" | "saving">(
    "idle"
  );
  const [loadedProgressKey, setLoadedProgressKey] = useState("");
  const [lastSyncedProgressSignature, setLastSyncedProgressSignature] = useState("");

  const selectedWeekDates = useMemo(
    () => getWeekDatesForSelection(context, selectedWeek),
    [context, selectedWeek]
  );

  const availableDays = useMemo(() => template?.days ?? [], [template]);

  const currentDay = useMemo(
    () => availableDays.find((day) => day.id === selectedDay) ?? availableDays[0] ?? null,
    [availableDays, selectedDay]
  );

  const activeTasks = useMemo(
    () =>
      sortTasks(
        (currentDay?.tasks ?? []).filter(
          (task) => task.enabled && task.activeWeeks.includes(selectedWeek)
        )
      ),
    [currentDay, selectedWeek]
  );

  const skippedTasks = useMemo(
    () =>
      sortTasks(
        (currentDay?.tasks ?? []).filter(
          (task) => task.enabled && !task.activeWeeks.includes(selectedWeek)
        )
      ),
    [currentDay, selectedWeek]
  );

  const isProgressReady =
    templateStatus === "ready" &&
    progressStatus !== "loading" &&
    currentDay !== null;
  const progress = !isProgressReady
    ? 0
    : activeTasks.length
      ? activeTasks.filter((task) => completed[task.id]).length / activeTasks.length
      : 1;
  const isComplete = progress === 1;
  const progressKey = `${formatDateForApi(selectedWeekDates[selectedDay])}:${selectedWeek}:${selectedDay}`;

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();
    webApp?.setHeaderColor?.("#f3efe6");
    webApp?.setBackgroundColor?.("#f3efe6");
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setTemplateStatus("loading");

    fetch("/api/checklist-template", {
      signal: controller.signal,
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load checklist template");
        }

        return (await response.json()) as {
          template: ChecklistTemplate;
        };
      })
      .then((payload) => {
        setTemplate(payload.template);
        setTemplateStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setTemplateStatus("error");
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!availableDays.length) {
      return;
    }

    const hasSelectedDay = availableDays.some((day) => day.id === selectedDay);

    if (!hasSelectedDay) {
      setSelectedDay(availableDays[0].id);
    }
  }, [availableDays, selectedDay]);

  function toggleTask(taskId: string) {
    setCompleted((current) => ({
      ...current,
      [taskId]: !current[taskId]
    }));
  }

  useEffect(() => {
    if (!currentDay) {
      return;
    }

    const selectedDate = formatDateForApi(selectedWeekDates[selectedDay]);
    const controller = new AbortController();

    setAdministratorStatus("loading");

    fetch(`/api/admin-on-duty?date=${selectedDate}`, {
      signal: controller.signal,
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load administrator");
        }

        return (await response.json()) as {
          administrator: string | null;
          monthKey?: string;
          dayKey?: string;
          dayKeyPadded?: string;
          hasMonth?: boolean;
          hasDay?: boolean;
        };
      })
      .then((payload) => {
        setAdministrator(payload.administrator);
        setAdministratorDebug(
          payload.administrator
            ? null
            : `Поиск: ${payload.monthKey ?? "?"} / ${payload.dayKeyPadded ?? payload.dayKey ?? "?"} • месяц: ${payload.hasMonth ? "ok" : "нет"} • день: ${payload.hasDay ? "ok" : "нет"}`
        );
        setAdministratorStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAdministrator(null);
        setAdministratorDebug(null);
        setAdministratorStatus("error");
      });

    return () => controller.abort();
  }, [currentDay, selectedDay, selectedWeekDates]);

  useEffect(() => {
    if (!currentDay) {
      return;
    }

    const selectedDate = formatDateForApi(selectedWeekDates[selectedDay]);
    const controller = new AbortController();

    setProgressStatus("loading");

    fetch(
      `/api/checklist-progress?date=${selectedDate}&week=${selectedWeek}&dayId=${selectedDay}`,
      {
        signal: controller.signal,
        cache: "no-store"
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load checklist progress");
        }

        return (await response.json()) as {
          completedTaskIds: string[];
        };
      })
      .then((payload) => {
        const activeTaskIds = new Set(currentDay.tasks.map((task) => task.id));
        const nextCompleted = payload.completedTaskIds.reduce<CompletionMap>((acc, taskId) => {
          if (activeTaskIds.has(taskId)) {
            acc[taskId] = true;
          }

          return acc;
        }, {});

        setCompleted(nextCompleted);
        setLoadedProgressKey(progressKey);
        setLastSyncedProgressSignature(
          JSON.stringify({
            progressKey,
            completedTaskIds: Object.keys(nextCompleted).sort()
          })
        );
        setProgressStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setCompleted({});
        setLoadedProgressKey(progressKey);
        setLastSyncedProgressSignature(
          JSON.stringify({
            progressKey,
            completedTaskIds: []
          })
        );
        setProgressStatus("ready");
      });

    return () => controller.abort();
  }, [currentDay, progressKey, selectedDay, selectedWeek, selectedWeekDates]);

  useEffect(() => {
    if (loadedProgressKey !== progressKey || progressStatus === "loading") {
      return;
    }

    const completedTaskIds = activeTasks
      .filter((task) => completed[task.id])
      .map((task) => task.id);
    const progressPercent = Math.round(progress * 100);
    const nextSignature = JSON.stringify({
      progressKey,
      completedTaskIds: [...completedTaskIds].sort()
    });

    if (lastSyncedProgressSignature === nextSignature) {
      return;
    }

    setProgressStatus("saving");

    fetch("/api/checklist-progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        checklistDate: formatDateForApi(selectedWeekDates[selectedDay]),
        weekCycle: selectedWeek,
        dayId: selectedDay,
        completedTaskIds,
        progressPercent
      })
    })
      .then(() => {
        setLastSyncedProgressSignature(nextSignature);
        setProgressStatus("ready");
      })
      .catch(() => {
        setProgressStatus("ready");
      });
  }, [
    activeTasks,
    completed,
    lastSyncedProgressSignature,
    loadedProgressKey,
    progress,
    progressKey,
    progressStatus,
    selectedDay,
    selectedWeek,
    selectedWeekDates
  ]);

  useEffect(() => {
    if (isProgressReady && isComplete && activeTasks.length > 0) {
      setConfettiBurstKey((current) => current + 1);
    }
  }, [activeTasks.length, isComplete, isProgressReady]);

  return (
    <main className="app-shell">
      {templateStatus === "error" ? (
        <section className="tasks-card">
          <p className="empty-state">Не удалось загрузить шаблон чеклиста.</p>
        </section>
      ) : null}

      <section className="hero-card">
        <h1>Чеклист смены</h1>
        <div className="hero-admin hero-admin--full">
          <span>Администратор</span>
          <strong>
            {administratorStatus === "loading"
              ? "Загрузка..."
              : administratorStatus === "error"
                ? "Нет данных"
                : administrator ?? "Не назначен"}
          </strong>
          {administratorDebug ? (
            <small className="hero-admin-debug">{administratorDebug}</small>
          ) : null}
        </div>
        <div className="hero-meta hero-meta--compact">
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
        </div>
        <div
          className="progress-pill"
          style={
            {
              "--progress-width": `${progress * 100}%`
            } as CSSProperties
          }
        >
          {isComplete ? (
            <div className="confetti-layer" key={confettiBurstKey} aria-hidden="true">
              {CONFETTI_PARTICLES.map((particle, index) => (
                <span
                  className="confetti-piece"
                  key={`${confettiBurstKey}-${index}`}
                  style={
                    {
                      "--confetti-delay": particle.delay,
                      "--confetti-duration": particle.duration,
                      "--confetti-x": particle.x,
                      "--confetti-y": particle.y,
                      "--confetti-rotate": particle.rotate,
                      "--confetti-color": particle.color
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          ) : null}
          <span>Прогресс</span>
          <strong>{Math.round(progress * 100)}%</strong>
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
                {week} н.
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <span className="control-title">День недели</span>
          <div className="chip-row">
            {availableDays.map((day) => (
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
            <h2>{currentDay?.title ?? "Загрузка..."}</h2>
          </div>
          <span className="section-date">{formatDate(selectedWeekDates[selectedDay])}</span>
        </div>

        {templateStatus === "loading" ? (
          <p className="empty-state">Загружаем шаблон чеклиста...</p>
        ) : activeTasks.length ? (
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

        {templateStatus === "loading" ? (
          <p className="empty-state">Загружаем шаблон чеклиста...</p>
        ) : skippedTasks.length ? (
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

function formatDateForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const CONFETTI_PARTICLES = [
  { x: "-44px", y: "-8px", delay: "0ms", duration: "920ms", rotate: "-120deg", color: "#ef476f" },
  { x: "-32px", y: "-34px", delay: "60ms", duration: "980ms", rotate: "-70deg", color: "#ffd166" },
  { x: "-8px", y: "-48px", delay: "20ms", duration: "1040ms", rotate: "-24deg", color: "#06d6a0" },
  { x: "18px", y: "-42px", delay: "100ms", duration: "960ms", rotate: "26deg", color: "#118ab2" },
  { x: "38px", y: "-18px", delay: "40ms", duration: "900ms", rotate: "84deg", color: "#f78c6b" },
  { x: "42px", y: "10px", delay: "140ms", duration: "940ms", rotate: "112deg", color: "#8338ec" },
  { x: "18px", y: "28px", delay: "180ms", duration: "880ms", rotate: "156deg", color: "#ff006e" },
  { x: "-10px", y: "22px", delay: "120ms", duration: "860ms", rotate: "-168deg", color: "#3a86ff" },
  { x: "-30px", y: "12px", delay: "80ms", duration: "910ms", rotate: "-148deg", color: "#fb5607" },
  { x: "-2px", y: "-58px", delay: "30ms", duration: "1080ms", rotate: "-8deg", color: "#ffbe0b" },
  { x: "28px", y: "-56px", delay: "150ms", duration: "990ms", rotate: "42deg", color: "#00bbf9" },
  { x: "-54px", y: "-24px", delay: "110ms", duration: "930ms", rotate: "-96deg", color: "#80ed99" }
] as const;
