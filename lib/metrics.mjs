// Weekly numbers per carrier for the dashboard (FR-16):
// gross revenue, average net rate per mile and empty-mile percentage.
// No imports, so it can be unit tested on its own.

// bookings: [{ carrier_id, carrier_name, deadhead_miles, net_rpm, rate_usd, loaded_miles, pickup_date }]
// Only bookings whose pickup date is in [weekStart, weekEnd] are counted.
export function weeklyCarrierMetrics(bookings, weekStart, weekEnd) {
  const byCarrier = new Map();

  for (const b of bookings) {
    if (!b.pickup_date || b.pickup_date < weekStart || b.pickup_date > weekEnd) continue;

    const row = byCarrier.get(b.carrier_id) ?? {
      carrierId: b.carrier_id,
      carrierName: b.carrier_name,
      loads: 0,
      grossRevenue: 0,
      loadedMiles: 0,
      emptyMiles: 0,
      netRevenue: 0, // net rate per mile x total miles, summed
    };

    const totalMiles = Number(b.loaded_miles) + Number(b.deadhead_miles);
    row.loads += 1;
    row.grossRevenue += Number(b.rate_usd);
    row.loadedMiles += Number(b.loaded_miles);
    row.emptyMiles += Number(b.deadhead_miles);
    row.netRevenue += Number(b.net_rpm) * totalMiles;
    byCarrier.set(b.carrier_id, row);
  }

  return [...byCarrier.values()]
    .map((row) => {
      const totalMiles = row.loadedMiles + row.emptyMiles;
      return {
        ...row,
        grossRevenue: Math.round(row.grossRevenue * 100) / 100,
        // Weighted by miles, so a long load counts more than a short one
        avgNetRpm: totalMiles > 0 ? Math.round((row.netRevenue / totalMiles) * 100) / 100 : 0,
        emptyShare: totalMiles > 0 ? row.emptyMiles / totalMiles : 0,
      };
    })
    .sort((a, b) => b.grossRevenue - a.grossRevenue);
}

// Totals across all carriers (for the summary line)
export function totalsOf(rows) {
  const loaded = rows.reduce((sum, r) => sum + r.loadedMiles, 0);
  const empty = rows.reduce((sum, r) => sum + r.emptyMiles, 0);
  const net = rows.reduce((sum, r) => sum + r.avgNetRpm * (r.loadedMiles + r.emptyMiles), 0);
  return {
    loads: rows.reduce((sum, r) => sum + r.loads, 0),
    grossRevenue: Math.round(rows.reduce((sum, r) => sum + r.grossRevenue, 0) * 100) / 100,
    avgNetRpm: loaded + empty > 0 ? Math.round((net / (loaded + empty)) * 100) / 100 : 0,
    emptyShare: loaded + empty > 0 ? empty / (loaded + empty) : 0,
  };
}
