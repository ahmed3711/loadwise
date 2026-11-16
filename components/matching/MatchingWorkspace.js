"use client";

import { useMemo, useState } from "react";
import { EQUIPMENT_TYPES, STATE_OPTIONS, labelFor } from "@/lib/constants";
import { formatMoney, formatNumber } from "@/lib/format";
import { LoadMatcher } from "@/lib/matching/load-matcher.mjs";
import { RANKING_MODES, DEFAULT_MODE_ID, getMode } from "@/lib/matching/ranking-modes.mjs";
import { DEFAULT_FUEL_COST } from "@/lib/matching/scoring.mjs";
import { lookupPlace } from "@/lib/matching/us-places.mjs";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import RankingModePicker from "./RankingModePicker";
import RankedLoadCard from "./RankedLoadCard";
import ExcludedLoads from "./ExcludedLoads";
import ThreadsPanel, { sharesById } from "./ThreadsPanel";
import { BoxIcon, MapPinIcon } from "@/components/icons";

export default function MatchingWorkspace({ vehicles, loads, initialVehicleId }) {
  const firstVehicle = vehicles.find((v) => String(v.id) === String(initialVehicleId)) ?? vehicles[0];

  const [vehicleId, setVehicleId] = useState(String(firstVehicle.id));
  const [city, setCity] = useState(firstVehicle.carriers.home_city);
  const [state, setState] = useState(firstVehicle.carriers.home_state);
  const [fuelCost, setFuelCost] = useState(String(DEFAULT_FUEL_COST));
  const [modeId, setModeId] = useState(DEFAULT_MODE_ID);
  const [stability, setStability] = useState(null); // { key, result }

  const vehicle = vehicles.find((v) => String(v.id) === vehicleId) ?? firstVehicle;
  const carrier = vehicle.carriers;
  const mode = getMode(modeId);
  const fuel = Number(fuelCost);
  const fuelValid = fuelCost !== "" && fuel >= 0 && fuel <= 5;
  const place = lookupPlace(city, state);

  // Steps 1 + 2 (fit chain, empty miles, net RPM, part scores) only
  // depend on the vehicle, the truck location and the fuel cost...
  const evaluation = useMemo(() => {
    const matcher = new LoadMatcher({
      vehicle,
      carrier,
      from: { city, state },
      fuelCostPerMile: fuelValid ? fuel : DEFAULT_FUEL_COST,
    });
    return { matcher, ...matcher.evaluate(loads) };
  }, [vehicle, carrier, city, state, fuel, fuelValid, loads]);

  // ...so switching the ranking mode only re-scores and re-sorts
  const ranked = useMemo(
    () => evaluation.matcher.rank(evaluation.fitting, mode.weights),
    [evaluation, mode]
  );

  // Stability results belong to one vehicle + location + fuel cost
  const inputsKey = `${vehicleId}|${city.trim().toLowerCase()}|${state}|${fuelCost}`;
  const stabilityResult = stability?.key === inputsKey ? stability.result : null;
  const shares = stabilityResult ? sharesById(stabilityResult) : null;

  function chooseVehicle(id) {
    const next = vehicles.find((v) => String(v.id) === id);
    if (!next) return;
    setVehicleId(id);
    // A new vehicle starts at its carrier's home base
    setCity(next.carriers.home_city);
    setState(next.carriers.home_state);
  }

  const vehicleOptions = vehicles.map((v) => ({
    value: String(v.id),
    label: `${v.plate_number} · ${labelFor(EQUIPMENT_TYPES, v.equipment_type)} · ${v.carriers.company_name}`,
  }));

  const topScore = ranked[0]?.score;
  const atHome = city.trim().toLowerCase() === carrier.home_city.toLowerCase() && state === carrier.home_state;

  return (
    <div className="space-y-6">
      {/* 1. Vehicle, location and fuel cost */}
      <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">1 · Vehicle and truck location</h2>
        <div className="grid gap-4 lg:grid-cols-[2fr_1.4fr_1fr_0.8fr]">
          <Select
            id="vehicle"
            label="Vehicle"
            value={vehicleId}
            onChange={(event) => chooseVehicle(event.target.value)}
            options={vehicleOptions}
            placeholder="Choose a vehicle"
          />
          <Input
            id="truck-city"
            label="Truck is now in (city)"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            maxLength={50}
          />
          <Select
            id="truck-state"
            label="State"
            value={state}
            onChange={(event) => setState(event.target.value)}
            options={STATE_OPTIONS}
          />
          <Input
            id="fuel-cost"
            label="Fuel $ / empty mile"
            type="number"
            step="0.05"
            min="0"
            max="5"
            value={fuelCost}
            onChange={(event) => setFuelCost(event.target.value)}
            error={fuelValid ? undefined : "0 to 5"}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
          <span>
            {labelFor(EQUIPMENT_TYPES, vehicle.equipment_type)} · {vehicle.length_ft} ft ·{" "}
            {formatNumber(vehicle.max_payload_lbs)} lbs · {vehicle.max_pallets} pallets
          </span>
          <span>
            Carrier minimum {formatMoney(carrier.min_rate_per_mile)}/mi · Home {carrier.home_city}, {carrier.home_state}
            {carrier.preferred_states?.length > 0 && ` · Prefers ${carrier.preferred_states.join(", ")}`}
          </span>
          <span className="flex items-center gap-1">
            <MapPinIcon className="h-3.5 w-3.5" />
            {!place
              ? "Unknown place: empty miles set to 0"
              : place.exact
                ? "Location found"
                : `City not in the list: using the centre of ${state}`}
            {!atHome && (
              <button
                type="button"
                onClick={() => chooseVehicle(vehicleId)}
                className="ml-2 font-semibold text-navy underline-offset-2 hover:underline"
              >
                Back to home base
              </button>
            )}
          </span>
        </div>
      </section>

      {/* 2. Ranking mode */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">2 · Ranking mode</h2>
        <RankingModePicker modes={RANKING_MODES} selectedId={modeId} onSelect={setModeId} />
      </section>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="Loads checked" value={loads.length} />
        <SummaryTile label="Fit this vehicle" value={ranked.length} accent />
        <SummaryTile label="Left out" value={evaluation.excluded.length} />
        <SummaryTile label="Top score" value={topScore != null ? `${topScore}/100` : "—"} />
      </div>

      {/* 3. Results */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          3 · Ranked loads <span className="normal-case tracking-normal">(best first, {mode.name})</span>
        </h2>
        {ranked.length === 0 ? (
          <EmptyState
            icon={<BoxIcon className="h-6 w-6" />}
            title="No loads fit this vehicle"
            message={
              loads.length === 0
                ? "There are no available loads with a pickup date from today. Add loads first."
                : "Every available load is too heavy, too long, has too many pallets or needs other equipment. See the reasons below."
            }
          />
        ) : (
          <ol className="space-y-3">
            {ranked.map((item, index) => (
              <RankedLoadCard
                key={item.load.id}
                item={item}
                rank={index + 1}
                mode={mode}
                winShare={shares ? shares.get(item.load.id) ?? 0 : null}
              />
            ))}
          </ol>
        )}
      </section>

      <ExcludedLoads excluded={evaluation.excluded} />

      <ThreadsPanel
        request={{ vehicleId: Number(vehicleId), city, state, fuelCost: fuelValid ? fuel : DEFAULT_FUEL_COST, modeId }}
        ranked={ranked}
        result={stabilityResult}
        onResult={(result) => setStability({ key: inputsKey, result })}
        canRun={ranked.length >= 2 && fuelValid && Boolean(place)}
      />
    </div>
  );
}

function SummaryTile({ label, value, accent = false }) {
  return (
    <div className={`rounded-2xl border bg-white px-5 py-4 shadow-sm ${accent ? "border-brand" : "border-line"}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy">{value}</p>
    </div>
  );
}
