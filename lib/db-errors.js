// Turns database error messages into friendly sentences for the user.
// (Postgres sends codes like 23505 for "duplicate value".)

export function friendlyDbError(error) {
  if (!error) return "";
  const message = error.message || "";

  // 23505 = unique value already exists
  if (error.code === "23505") {
    if (message.includes("mc_number")) return "A carrier with this MC number already exists.";
    if (message.includes("dot_number")) return "A carrier with this USDOT number already exists.";
    if (message.includes("vin")) return "A vehicle with this VIN already exists.";
    return "This record already exists.";
  }

  // 23514 = a CHECK constraint (database validation rule) was broken
  if (error.code === "23514") {
    return "The database rejected one of the values. Please check the form and try again.";
  }

  // 42501 = Row Level Security blocked the action
  if (error.code === "42501") {
    return "You don't have permission to do this.";
  }

  // 23503 = the linked record (e.g. carrier) doesn't exist any more
  if (error.code === "23503") {
    return "The linked record no longer exists. Please refresh the page.";
  }

  // P0001 = our own database message, e.g. "Pickup date cannot be in the past"
  if (error.code === "P0001") {
    return message;
  }

  return message || "Something went wrong. Please try again.";
}
