export function formatMad(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString('fr-FR')} MAD`;
}

export function formatDateFr(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-MA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTimeFr(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-MA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
