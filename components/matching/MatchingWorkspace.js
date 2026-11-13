"use client";

import { useState } from "react";
import RankedLoadCard from "./RankedLoadCard";
import WeightsCard from "./WeightsCard";
import AiAdvicePanel from "./AiAdvicePanel";
import BookDialog from "./BookDialog";

// Everything on the Matching page that the user clicks on:
// the ranked list, the "Book" pop-up, the weights editor and AI advice.
export default function MatchingWorkspace({ vehicleId, carrier, weights, ranked, brokers, aiReady }) {
  const [toBook, setToBook] = useState(null);
  const [advice, setAdvice] = useState(null);

  const verdicts = new Map((advice?.picks ?? []).map((pick) => [pick.load_id, pick]));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Ranked loads" className="space-y-4">
        {ranked.map((item, index) => (
          <RankedLoadCard
            key={item.load.id}
            rank={index + 1}
            item={item}
            weights={weights}
            minRate={carrier.min_rate_per_mile}
            verdict={verdicts.get(item.load.id)}
            onBook={() => setToBook(item)}
          />
        ))}
      </section>

      <aside className="space-y-6">
        <AiAdvicePanel vehicleId={vehicleId} aiReady={aiReady} advice={advice} onAdvice={setAdvice} />
        <WeightsCard carrier={carrier} weights={weights} />
      </aside>

      <BookDialog
        key={toBook?.load.id ?? "closed"}
        item={toBook}
        vehicleId={vehicleId}
        broker={toBook ? brokers[toBook.load.broker_mc] : null}
        onClose={() => setToBook(null)}
      />
    </div>
  );
}
