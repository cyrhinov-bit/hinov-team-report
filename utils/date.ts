// Date utilities for HTR (Hinov Team Report)

export function getWeekNumber(date: Date = new Date()): { week: number; year: number } {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNr = (target.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
  target.setDate(target.getDate() - dayNr + 3); // Thursday in current week
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return { week: weekNumber, year: new Date(firstThursday).getFullYear() };
}

export function getWeekRange(week: number, year: number): {
  startDate: string;
  endDate: string;
  days: { dayOfWeek: number; dateStr: string; label: string }[];
} {
  // In ISO-8601, January 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
  // Monday of Week 1
  const monWeek1 = new Date(year, 0, 4 - jan4Day);
  // Monday of Week W
  const monday = new Date(monWeek1.getFullYear(), monWeek1.getMonth(), monWeek1.getDate() + (week - 1) * 7);

  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const days: { dayOfWeek: number; dateStr: string; label: string }[] = [];

  for (let i = 0; i < 5; i++) {
    const current = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    days.push({
      dayOfWeek: i + 1,
      dateStr: `${yyyy}-${mm}-${dd}`,
      label: dayNames[i],
    });
  }

  return {
    startDate: days[0].dateStr,
    endDate: days[4].dateStr,
    days,
  };
}

export function formatFrenchDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export const FRENCH_DAYS = [
  { key: 1, label: 'Lundi' },
  { key: 2, label: 'Mardi' },
  { key: 3, label: 'Mercredi' },
  { key: 4, label: 'Jeudi' },
  { key: 5, label: 'Vendredi' },
];

