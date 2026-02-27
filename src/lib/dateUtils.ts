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

export function calculateAge(dateString: string): string {
  if (!dateString) return "";
  
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return "";

  const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();
  
  // Reset time to midnight for accurate day calculation
  today.setHours(0, 0, 0, 0);
  birthDate.setHours(0, 0, 0, 0);

  let years = today.getFullYear() - birthDate.getFullYear();
  
  // Create a date for the birthday in the current year
  const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  
  // If the birthday hasn't happened yet this year, subtract one year
  if (today < birthdayThisYear) {
    years--;
    birthdayThisYear.setFullYear(today.getFullYear() - 1);
  }

  // Calculate the difference in days between today and the last birthday
  const diffTime = Math.abs(today.getTime() - birthdayThisYear.getTime());
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const yearStr = years === 1 ? "año" : "años";
  const dayStr = days === 1 ? "día" : "días";
  
  if (days === 0) {
    return `${years} ${yearStr}`;
  }
  return `${years} ${yearStr} y ${days} ${dayStr}`;
}
