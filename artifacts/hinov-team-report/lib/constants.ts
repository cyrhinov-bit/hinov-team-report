export const WEEK_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as const;

export function getCurrentWeekRange(): { start: string; end: string } {
  const start = new Date();
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return {
    start: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    end: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
  };
}

export function dateToWeekDay(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const dayIndex = Math.min(Math.max(date.getDay() - 1, 0), 4);
  return WEEK_DAYS[dayIndex];
}
