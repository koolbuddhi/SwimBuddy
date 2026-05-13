function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function csToTime(cs: number): string {
  const mm = Math.floor(cs / 6000);
  const ss = Math.floor((cs % 6000) / 100);
  const c  = cs % 100;
  return `${pad(mm)}:${pad(ss)}.${pad(c)}`;
}

export function formatTimeInput(digits: string): string {
  const d = (digits || '0').padStart(6, '0').slice(-6);
  return `${d.slice(0, 2)}:${d.slice(2, 4)}.${d.slice(4, 6)}`;
}

export function todayISO(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in device-local time
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export function isYesterday(iso: string): boolean {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return iso === d.toLocaleDateString('en-CA');
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateLong(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function relativeDate(iso: string): string {
  if (isToday(iso)) return 'Today';
  if (isYesterday(iso)) return 'Yesterday';
  return formatDate(iso);
}
