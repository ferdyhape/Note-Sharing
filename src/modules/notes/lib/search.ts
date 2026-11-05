export function matchesNoteSearch(note: { title: string; contentText: string }, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return note.title.toLowerCase().includes(query) || note.contentText.toLowerCase().includes(query);
}
