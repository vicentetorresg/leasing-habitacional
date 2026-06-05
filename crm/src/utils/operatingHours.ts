// Chilean public holidays (fixed + approximate movable ones for 2025-2027)
// Movable holidays are approximated; update yearly if needed.

const FIXED_HOLIDAYS: Array<[number, number]> = [
  [1, 1],   // Año Nuevo
  [5, 1],   // Día del Trabajo
  [5, 21],  // Día de las Glorias Navales
  [6, 20],  // Día Nacional de los Pueblos Indígenas (approx solstice)
  [6, 29],  // San Pedro y San Pablo (can move)
  [7, 16],  // Virgen del Carmen
  [8, 15],  // Asunción de la Virgen
  [9, 18],  // Fiestas Patrias
  [9, 19],  // Día de las Glorias del Ejército
  [10, 12], // Encuentro de Dos Mundos (can move)
  [10, 31], // Día de las Iglesias Evangélicas
  [11, 1],  // Día de Todos los Santos
  [12, 8],  // Inmaculada Concepción
  [12, 25], // Navidad
];

// Viernes Santo & Sábado Santo (approximate for 2025-2027)
const EASTER_HOLIDAYS: Record<number, Array<[number, number]>> = {
  2025: [[4, 18], [4, 19]],
  2026: [[4, 3], [4, 4]],
  2027: [[3, 26], [3, 27]],
};

export function isChileanHoliday(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  // Check fixed holidays
  if (FIXED_HOLIDAYS.some(([m, d]) => m === month && d === day)) return true;

  // Check Easter-based holidays
  const easterDays = EASTER_HOLIDAYS[year];
  if (easterDays && easterDays.some(([m, d]) => m === month && d === day)) return true;

  return false;
}

export interface DaySchedule {
  start: string; // "09:00"
  end: string;   // "18:30"
  lunchStart?: string; // "13:00"
  lunchEnd?: string;   // "14:00"
}

export type WeekSchedule = {
  mon: DaySchedule | null;
  tue: DaySchedule | null;
  wed: DaySchedule | null;
  thu: DaySchedule | null;
  fri: DaySchedule | null;
  sat: DaySchedule | null;
  sun: DaySchedule | null;
};

const DAY_KEYS: Array<keyof WeekSchedule> = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function isWithinOperatingHours(schedule: WeekSchedule): boolean {
  // Use Chile time
  const now = new Date();
  const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));

  // Check holiday
  if (isChileanHoliday(chileTime)) return false;

  const dayKey = DAY_KEYS[chileTime.getDay()];
  const daySchedule = schedule[dayKey];

  if (!daySchedule) return false; // Day off

  const currentMinutes = chileTime.getHours() * 60 + chileTime.getMinutes();
  const [startH, startM] = daySchedule.start.split(':').map(Number);
  const [endH, endM] = daySchedule.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (currentMinutes < startMinutes || currentMinutes >= endMinutes) return false;

  // Check lunch break
  if (daySchedule.lunchStart && daySchedule.lunchEnd) {
    const [lsH, lsM] = daySchedule.lunchStart.split(':').map(Number);
    const [leH, leM] = daySchedule.lunchEnd.split(':').map(Number);
    const lunchStartMin = lsH * 60 + lsM;
    const lunchEndMin = leH * 60 + leM;
    if (currentMinutes >= lunchStartMin && currentMinutes < lunchEndMin) return false;
  }

  return true;
}

export const DEFAULT_SCHEDULE: WeekSchedule = {
  mon: { start: '09:00', end: '18:30', lunchStart: '13:00', lunchEnd: '14:00' },
  tue: { start: '09:00', end: '18:30', lunchStart: '13:00', lunchEnd: '14:00' },
  wed: { start: '09:00', end: '18:30', lunchStart: '13:00', lunchEnd: '14:00' },
  thu: { start: '09:00', end: '18:30', lunchStart: '13:00', lunchEnd: '14:00' },
  fri: { start: '09:00', end: '14:00' },
  sat: null,
  sun: null,
};
