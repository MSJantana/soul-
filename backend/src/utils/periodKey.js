function pad2(n) {
  return String(n).padStart(2, "0");
}

function getISOWeekInfo(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);

  const isoYear = d.getUTCFullYear();

  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);

  const week = 1 + Math.round((d - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return { isoYear, week };
}

function getPeriodKey(date, period) {
  const d = date instanceof Date ? date : new Date(date);

  if (period === "WEEK" || period === "SEMANAL") {
    const { isoYear, week } = getISOWeekInfo(d);
    return `${isoYear}-W${pad2(week)}`;
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  if (period === "MONTH" || period === "MES") {
    return `${year}-${pad2(month)}`;
  }

  if (period === "QUARTER" || period === "QUADRIENAL") {
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}-Q${quarter}`;
  }

  if (period === "SEMESTER" || period === "SEMESTRAL" || period === "SEMETRAL") {
    const semester = month <= 6 ? 1 : 2;
    return `${year}-S${semester}`;
  }

  if (period === "YEAR" || period === "ANO") {
    return `${year}`;
  }

  throw new Error(`Period inválido: ${String(period)}`);
}

module.exports = { getPeriodKey };
