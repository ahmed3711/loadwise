import Badge from "@/components/ui/Badge";
import { LOAD_STATUSES, labelFor } from "@/lib/constants";

// Coloured badge for a load's status
const STATUS_COLORS = {
  available: "green",
  booked: "blue",
  picked_up: "purple",
  in_transit: "amber",
  delivered: "slate",
  paid: "green",
};

export default function StatusBadge({ status }) {
  return <Badge color={STATUS_COLORS[status] ?? "slate"}>{labelFor(LOAD_STATUSES, status)}</Badge>;
}
