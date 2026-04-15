const KEY = "treino-app:active-workout-v1";

export type PersistedWorkoutState = {
  v: 1;
  signature: string;
  swBySet: Record<string, number[]>;
  srBySet: Record<string, number[]>;
  ds: Record<string, number>;
  skip: Record<string, boolean>;
  warmDone: boolean;
  finisherDone: boolean;
  postDone: boolean;
  focusMode: boolean;
  focusExIdx: number;
};

export function workoutSessionSignature(wo: { id: string; exercises: { id: string }[] }, quickFlag: boolean, altKey: string): string {
  return `${wo.id}:${wo.exercises.map((e) => e.id).join(",")}:${quickFlag ? 1 : 0}:${altKey}`;
}

export function loadWorkoutSession(signature: string): PersistedWorkoutState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedWorkoutState;
    if (p.v !== 1 || p.signature !== signature) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveWorkoutSession(p: PersistedWorkoutState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore quota */
  }
}

export function clearWorkoutSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
