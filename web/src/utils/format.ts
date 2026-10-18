const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDate(iso: string | null) {
  return iso ? dateFormatter.format(new Date(iso)) : '';
}

export function joinAuthors(authors: string[], fallback: string) {
  return authors.length > 0 ? authors.slice(0, 3).join(', ') : fallback;
}
