const FIELDS = ['buildFee', 'monthlyFee', 'hostingCostMonthly', 'toolCostMonthly', 'buildHours', 'monthlyHours', 'months'];

export function calcPricing(input = {}) {
  const errors = {};
  const v = {};
  for (const f of FIELDS) {
    const raw = input[f] ?? (f === 'months' ? 12 : 0);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) errors[f] = 'Must be a number of 0 or more.';
    v[f] = n;
  }
  if (!errors.months && (v.months < 1 || v.months > 60 || !Number.isInteger(v.months))) errors.months = 'Use a whole number of months between 1 and 60.';
  if (Object.keys(errors).length) return { ok: false, errors };

  const revenue = v.buildFee + v.monthlyFee * v.months;
  const costs = (v.hostingCostMonthly + v.toolCostMonthly) * v.months;
  const profit = revenue - costs;
  const hours = v.buildHours + v.monthlyHours * v.months;
  const round2 = n => Math.round(n * 100) / 100;
  return {
    ok: true,
    result: {
      revenue: round2(revenue),
      costs: round2(costs),
      profit: round2(profit),
      hours: round2(hours),
      effectiveHourly: hours > 0 ? round2(profit / hours) : null,
      monthlyMargin: round2(v.monthlyFee - v.hostingCostMonthly - v.toolCostMonthly),
      months: v.months,
    },
  };
}
