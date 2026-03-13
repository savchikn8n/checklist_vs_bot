export type DayId =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type LegacyChecklistTask = {
  id: string;
  text: string;
  offWeeks: number[];
};

export type LegacyChecklistDay = {
  id: DayId;
  title: string;
  shortTitle: string;
  tasks: LegacyChecklistTask[];
};

export type ChecklistTemplateTask = {
  id: string;
  text: string;
  activeWeeks: number[];
  sortOrder: number;
  enabled: boolean;
};

export type ChecklistTemplateDay = {
  id: DayId;
  title: string;
  shortTitle: string;
  sortOrder: number;
  enabled: boolean;
  tasks: ChecklistTemplateTask[];
};

export type ChecklistTemplate = {
  version: number;
  workspaceId: string;
  weekCycleLength: number;
  days: ChecklistTemplateDay[];
};

export const DEFAULT_WEEK_CYCLE_LENGTH = 4;
export const WEEK_OPTIONS = [1, 2, 3, 4] as const;

export const DAY_ORDER: DayId[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

export const DAY_LABELS: Record<DayId, string> = {
  monday: "Понедельник",
  tuesday: "Вторник",
  wednesday: "Среда",
  thursday: "Четверг",
  friday: "Пятница",
  saturday: "Суббота",
  sunday: "Воскресенье"
};

export const LEGACY_CHECKLIST_DAYS: LegacyChecklistDay[] = [
  {
    id: "monday",
    title: "Понедельник",
    shortTitle: "Пн",
    tasks: [
      {
        id: "monday-storage",
        text: "Убираемся в кладовке: раскладываем все по местам, протираем полки и микроволновку",
        offWeeks: [1, 3, 4]
      },
      {
        id: "monday-pillows",
        text: "Поднимаем диванные подушки, пылесосим, вытряхиваем мусор, протираем посадки под подушками и низ паллет, полукруглый диван пылесосим с насадкой-щеткой",
        offWeeks: [2, 4]
      },
      {
        id: "monday-vacuum",
        text: "Разбираем, вытряхиваем и промываем пылесос",
        offWeeks: [2, 4]
      },
      {
        id: "monday-bucket",
        text: "Отмываем ведро с ершиками и колпак кальянной станции, протираем проточник",
        offWeeks: []
      },
      {
        id: "monday-shelves",
        text: "Протереть полки под играми, разложить по местам, подклеить, выкинуть лишнее",
        offWeeks: []
      },
      {
        id: "monday-carafes",
        text: "Помыть графины для воды",
        offWeeks: [1, 3]
      }
    ]
  },
  {
    id: "tuesday",
    title: "Вторник",
    shortTitle: "Вт",
    tasks: [
      {
        id: "tuesday-tobacco",
        text: "Протираем основательно полки и кейсы под табак",
        offWeeks: []
      },
      {
        id: "tuesday-hoses",
        text: "Замачиваем, промываем шланги, мундштуки промыть (разбираем, раскручиваем)",
        offWeeks: [2, 4]
      },
      {
        id: "tuesday-closet",
        text: "Протираем гардероб (все полки и рейки) аудиосистему (баллоном продуваем на выключенную)",
        offWeeks: [2, 4]
      },
      {
        id: "tuesday-top-shelf",
        text: "Протираем верхнюю полку бара вместе с декором",
        offWeeks: [1, 3]
      },
      {
        id: "tuesday-projector",
        text: "Протираем от пыли проектор (пипидастр) и линзу (тряпка под кассой)",
        offWeeks: [2, 4]
      },
      {
        id: "tuesday-metal",
        text: "Протираем все металлические соединения, за подушками, посадки, низ паллет",
        offWeeks: [1, 3]
      }
    ]
  },
  {
    id: "wednesday",
    title: "Среда",
    shortTitle: "Ср",
    tasks: [
      {
        id: "wednesday-thermos",
        text: "Протираем полку под термосами, чайниками | термосы и резинки",
        offWeeks: [2, 4]
      },
      {
        id: "wednesday-grids",
        text: "Протираем все сетки для кальянов",
        offWeeks: [1, 3]
      },
      {
        id: "wednesday-partitions",
        text: "Протираем перегородку между 6 и 7 и обеспыливаем кальяны в ней",
        offWeeks: [1, 3]
      },
      {
        id: "wednesday-dishwasher",
        text: "Ставим посудомойку на режим промывки",
        offWeeks: [2, 3, 4]
      },
      {
        id: "wednesday-glass",
        text: "Моем стекло в коридоре с двух сторон",
        offWeeks: []
      },
      {
        id: "wednesday-ice-maker",
        text: "Протираем вентиляцию у льдогенератора",
        offWeeks: [2, 3, 4]
      },
      {
        id: "wednesday-extractor",
        text: "Обеспыливаем вытяжку",
        offWeeks: [1, 2, 4]
      }
    ]
  },
  {
    id: "thursday",
    title: "Четверг",
    shortTitle: "Чт",
    tasks: [
      {
        id: "thursday-lamps",
        text: "Протираем все торшерные лампы и светильники над картинами",
        offWeeks: []
      },
      {
        id: "thursday-mirrors",
        text: "Протираем зеркала в зале и телевизоры (сверху, сбоку, сзади)",
        offWeeks: []
      },
      {
        id: "thursday-sills",
        text: "Подоконники над круглым диваном",
        offWeeks: []
      },
      {
        id: "thursday-ps",
        text: "Протираем PS - воздуховоды (чистим пылесосом маленькой насадкой на выключенную)",
        offWeeks: [1, 3]
      },
      {
        id: "thursday-bar-lamps",
        text: "Обеспыливаем верхние лампы бара и шину",
        offWeeks: [1, 2, 3]
      },
      {
        id: "thursday-fridge",
        text: "Разморозка барного холодильника. Протираем резинки всех холодильников",
        offWeeks: [1, 2, 4]
      },
      {
        id: "thursday-shelves",
        text: "Наводим порядок в 2 полках под чашками и под станцией",
        offWeeks: [2]
      }
    ]
  },
  {
    id: "friday",
    title: "Пятница",
    shortTitle: "Пт",
    tasks: [
      {
        id: "friday-speaker",
        text: "Обеспыливаем колонку, вытяжку, датчик в туалете",
        offWeeks: [1, 3, 4]
      },
      {
        id: "friday-medkit",
        text: "Складываем и протираем аптечку",
        offWeeks: [1, 3]
      },
      {
        id: "friday-utensils",
        text: "Промываем стакан под приборами",
        offWeeks: [2, 4]
      },
      {
        id: "friday-corridor",
        text: "Обеспыливаем шину в коридоре, протираем зеркало",
        offWeeks: [1, 3]
      },
      {
        id: "friday-cups",
        text: "Промываем коврик под чашками",
        offWeeks: []
      },
      {
        id: "friday-sockets",
        text: "Обеспыливаем все розетки",
        offWeeks: [2, 4]
      }
    ]
  },
  {
    id: "saturday",
    title: "Суббота",
    shortTitle: "Сб",
    tasks: [
      {
        id: "saturday-fire-extinguishers",
        text: "Протираем все огнетушители (3 шт) и пожарные кнопки (3)",
        offWeeks: []
      },
      {
        id: "saturday-box",
        text: "Протираем короб со всех сторон, трубу над баром",
        offWeeks: [2, 4]
      },
      {
        id: "saturday-rack",
        text: "Протираем стеллаж между 13 и 14",
        offWeeks: []
      }
    ]
  },
  {
    id: "sunday",
    title: "Воскресенье",
    shortTitle: "Вс",
    tasks: [
      {
        id: "sunday-tvs",
        text: "Протираем телевизоры (сверху, сбоку, сзади)",
        offWeeks: []
      },
      {
        id: "sunday-rings",
        text: "Промываем кейс под кольцами, кольца меняем свежими",
        offWeeks: []
      },
      {
        id: "sunday-dresser",
        text: "Пылесосим комод внутри, протираем ящики бара",
        offWeeks: [1, 3]
      },
      {
        id: "sunday-shelf",
        text: "Протираем стеллаж с плойками 11/12, станции под джойстики и декор",
        offWeeks: []
      },
      {
        id: "sunday-kettles",
        text: "Замачиваем часть чайников в мистике (кислородном отбеливателе)",
        offWeeks: [2, 4]
      },
      {
        id: "sunday-dispensers",
        text: "Промываем диспенсеры под салфетки",
        offWeeks: [2, 4]
      }
    ]
  }
];

export function migrateChecklistDaysToTemplate(
  legacyDays: LegacyChecklistDay[],
  options?: {
    version?: number;
    workspaceId?: string;
    weekCycleLength?: number;
  }
): ChecklistTemplate {
  const version = options?.version ?? 1;
  const workspaceId = options?.workspaceId ?? "default";
  const weekCycleLength = options?.weekCycleLength ?? DEFAULT_WEEK_CYCLE_LENGTH;
  const allWeeks = Array.from({ length: weekCycleLength }, (_, index) => index + 1);

  return {
    version,
    workspaceId,
    weekCycleLength,
    days: legacyDays.map((day, dayIndex) => ({
      id: day.id,
      title: day.title,
      shortTitle: day.shortTitle,
      sortOrder: dayIndex + 1,
      enabled: true,
      tasks: day.tasks.map((task, taskIndex) => ({
        id: task.id,
        text: task.text,
        activeWeeks: allWeeks.filter((week) => !task.offWeeks.includes(week)),
        sortOrder: taskIndex + 1,
        enabled: true
      }))
    }))
  };
}

export function sortChecklistTemplate(template: ChecklistTemplate): ChecklistTemplate {
  return {
    ...template,
    days: [...template.days]
      .filter((day) => day.enabled)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((day) => ({
        ...day,
        tasks: [...day.tasks]
          .filter((task) => task.enabled)
          .sort((left, right) => left.sortOrder - right.sortOrder)
      }))
  };
}

export const LOCAL_CHECKLIST_TEMPLATE = sortChecklistTemplate(
  migrateChecklistDaysToTemplate(LEGACY_CHECKLIST_DAYS)
);
