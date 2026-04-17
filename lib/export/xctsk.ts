import type { TaskPointType } from "@/types/course";

export type XctskTurnpointInput = {
  order: number;
  name: string;
  label?: string;
  lat?: number;
  lng?: number;
  radiusM: number;
  taskType: TaskPointType;
  elevationM?: number | null;
};

type BuildXctskParams = {
  turnpoints: XctskTurnpointInput[];
  sssOpenTime?: string;
  taskDeadlineTime?: string;
};

type XctskTurnpointType = "TAKEOFF" | "SSS" | "ESS";

function toWaypointName(turnpoint: XctskTurnpointInput) {
  return turnpoint.name;
}

function toDescription(turnpoint: XctskTurnpointInput) {
  return turnpoint.label ?? "";
}

function toZuluTime(time: string | undefined, fallback: string) {
  const value = (time ?? "").trim();
  const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);

  if (!match) {
    return fallback;
  }

  const [, hour, minute, second] = match;
  return `${hour}:${minute}:${second ?? "00"}Z`;
}

export function buildXctskTaskFile({
  turnpoints,
  sssOpenTime,
  taskDeadlineTime,
}: BuildXctskParams) {
  const validTurnpoints = turnpoints.filter(
    (
      turnpoint
    ): turnpoint is XctskTurnpointInput & {
      lat: number;
      lng: number;
    } => typeof turnpoint.lat === "number" && typeof turnpoint.lng === "number"
  );

  const normalizedTurnpoints =
    (() => {
      if (validTurnpoints.length === 0) {
        return validTurnpoints;
      }

      const ensuredGoalTurnpoints =
        (() => {
          const existingGoalIndex = validTurnpoints.findIndex(
            (turnpoint) => turnpoint.taskType === "goal"
          );

          if (existingGoalIndex >= 0) {
            return validTurnpoints;
          }

          if (validTurnpoints.length === 1) {
            const onlyTurnpoint = validTurnpoints[0];
            return [
              {
                ...onlyTurnpoint,
                taskType: "start" as const,
              },
              {
                ...onlyTurnpoint,
                taskType: "goal" as const,
              },
            ];
          }

          return validTurnpoints.map((turnpoint, index, all) =>
            index === all.length - 1
              ? {
                  ...turnpoint,
                  taskType: "goal" as const,
                }
              : turnpoint
          );
        })();

      const goalIndex = ensuredGoalTurnpoints.findIndex(
        (turnpoint) => turnpoint.taskType === "goal"
      );
      const hasEss = ensuredGoalTurnpoints.some(
        (turnpoint) => turnpoint.taskType === "ess"
      );

      if (goalIndex < 0 || hasEss) {
        return ensuredGoalTurnpoints;
      }

      const goalTurnpoint = ensuredGoalTurnpoints[goalIndex];
      const essTurnpoint: XctskTurnpointInput & { lat: number; lng: number } = {
        ...goalTurnpoint,
        taskType: "ess",
      };

      return [
        ...ensuredGoalTurnpoints.slice(0, goalIndex),
        essTurnpoint,
        goalTurnpoint,
        ...ensuredGoalTurnpoints.slice(goalIndex + 1),
      ];
    })();

  const firstGoalIndex = normalizedTurnpoints.findIndex(
    (turnpoint) => turnpoint.taskType === "goal"
  );
  const sssIndex = normalizedTurnpoints.findIndex(
    (turnpoint) => turnpoint.taskType === "sss"
  );
  const essIndex = normalizedTurnpoints.findIndex(
    (turnpoint) => turnpoint.taskType === "ess"
  );

  const xctskTurnpoints = normalizedTurnpoints.map((turnpoint, index) => {
    let type: XctskTurnpointType | undefined;

    if (turnpoint.taskType === "start" || index === 0) {
      type = "TAKEOFF";
    } else if (sssIndex >= 0 && index === sssIndex) {
      type = "SSS";
    } else if (essIndex >= 0 && index === essIndex) {
      type = "ESS";
    }

    return {
      radius: Math.round(turnpoint.radiusM),
      waypoint: {
        lon: turnpoint.lng,
        lat: turnpoint.lat,
        altSmoothed: Math.round(turnpoint.elevationM ?? 0),
        name: toWaypointName(turnpoint),
        description: toDescription(turnpoint),
      },
      ...(type ? { type } : {}),
    };
  });

  const payload = {
    version: 1,
    taskType: "CLASSIC",
    turnpoints: xctskTurnpoints,
    ...(normalizedTurnpoints.length > 1
      ? {
          sss: {
            type: "RACE",
            direction: "EXIT",
            timeGates: [toZuluTime(sssOpenTime, "12:00:00Z")],
          },
        }
      : {}),
    ...(firstGoalIndex >= 0
      ? {
          goal: {
            type: "CYLINDER",
            deadline: toZuluTime(taskDeadlineTime, "23:00:00Z"),
          },
        }
      : {}),
    earthModel: "WGS84",
  };

  return JSON.stringify(payload);
}

export function buildXctskQrPayload({
  turnpoints,
  sssOpenTime,
  taskDeadlineTime,
}: BuildXctskParams) {
  const filePayload = buildXctskTaskFile({
    turnpoints,
    sssOpenTime,
    taskDeadlineTime,
  });

  return `XCTSK:${filePayload}`;
}
