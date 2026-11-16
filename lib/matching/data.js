import { todayString } from "@/lib/format";

// Reads what the Matching page needs from Supabase (Row Level Security
// decides which rows each user can see).

export async function getVehiclesWithCarriers(supabase) {
  return supabase
    .from("vehicles")
    .select("*, carriers(*)")
    .order("plate_number", { ascending: true });
}

// Loads that can still be booked: available and pickup today or later
export async function getMatchableLoads(supabase) {
  return supabase
    .from("loads")
    .select("*")
    .eq("status", "available")
    .gte("pickup_date", todayString())
    .order("pickup_date", { ascending: true });
}
