export function formatDate(dateString: string): string {
  if (!dateString) return "";
  // Create a date object from the string (e.g., "2010-05-15")
  // By splitting and passing year, month-1, day, we avoid timezone shifts
  // that happen when parsing "YYYY-MM-DD" directly with new Date()
  const [year, month, day] = dateString.split('-');
  if (year && month && day) {
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString();
  }
  
  // Fallback
  return new Date(dateString).toLocaleDateString();
}
