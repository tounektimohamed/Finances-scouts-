export function formatTND(amount: number, locale: "ar" | "fr" = "ar"): string {
  // Tunisian Milimes require 3 decimal precision
  const formatted = amount.toFixed(3);
  if (locale === "ar") {
    return `${formatted} د.ت`;
  }
  return `${formatted} TND`;
}

export function formatDate(dateStr: string, locale: "ar" | "fr" = "ar"): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    if (locale === "ar") {
      return d.toLocaleDateString("ar-TN", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    }
    return d.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (e) {
    return dateStr;
  }
}

export function calculateCampDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 10; // Default fallback
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
}
