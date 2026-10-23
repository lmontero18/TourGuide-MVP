// "jue 23 oct". La fecha es YYYY-MM-DD sin hora: se arma en local para que no
// se corra un dia por la zona horaria.
export function formatBookingDate(date: string, locale: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, options);
}
