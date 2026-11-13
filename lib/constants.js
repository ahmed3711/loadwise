// Lists used across the app (dropdowns, labels and validation).
// Keeping them in one place means the forms, tables and CSV upload
// always use exactly the same values.

export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export const STATE_CODES = US_STATES.map((state) => state.code);

export const STATE_OPTIONS = US_STATES.map((state) => ({
  value: state.code,
  label: `${state.code} – ${state.name}`,
}));

export const EQUIPMENT_TYPES = [
  { value: "cargo_van", label: "Cargo van" },
  { value: "box_truck", label: "Box truck" },
  { value: "dry_van", label: "Dry van" },
  { value: "reefer", label: "Reefer" },
  { value: "flatbed", label: "Flatbed" },
];

export const EQUIPMENT_VALUES = EQUIPMENT_TYPES.map((type) => type.value);

export const LOAD_STATUSES = [
  { value: "available", label: "Available" },
  { value: "booked", label: "Booked" },
  { value: "picked_up", label: "Picked up" },
  { value: "in_transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
  { value: "paid", label: "Paid" },
];

// The 4 roles (value = saved in the database, label = shown to the user)
export const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "carrier_owner", label: "Carrier Owner" },
  { value: "driver", label: "Driver" },
];

export const ROLE_VALUES = ROLES.map((role) => role.value);

// Finds the label for a value, e.g. labelFor(ROLES, "carrier_owner") -> "Carrier Owner"
export function labelFor(list, value) {
  const item = list.find((entry) => entry.value === value);
  return item ? item.label : value || "—";
}

// Only Admins and Dispatchers can add, edit and delete.
// Carrier Owners and Drivers can only view (matches the database RLS rules).
export function canManage(role) {
  return role === "admin" || role === "dispatcher";
}

// ---------------------------------------------------------------------
// Final milestone: bookings, brokers, invoices
// ---------------------------------------------------------------------

// A booking moves through these steps in order (FR-13)
export const BOOKING_STEPS = ["booked", "picked_up", "in_transit", "delivered", "paid"];

// The next step after "status", or null when it's already "paid"
export function nextBookingStatus(status) {
  const index = BOOKING_STEPS.indexOf(status);
  return index >= 0 && index < BOOKING_STEPS.length - 1 ? BOOKING_STEPS[index + 1] : null;
}

// Button text for moving a booking to its next step
export const NEXT_STEP_LABELS = {
  picked_up: "Mark picked up",
  in_transit: "Mark in transit",
  delivered: "Mark delivered",
  paid: "Mark paid",
};

// Drivers can move their own loads up to "Delivered"
export function canMoveBooking(role, nextStatus) {
  if (!nextStatus) return false;
  if (canManage(role)) return true;
  return role === "driver" && ["picked_up", "in_transit", "delivered"].includes(nextStatus);
}

export const BROKER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "not_found", label: "Not found" },
];

// Typical fuel cost per mile for each vehicle type (pre-fills the vehicle form)
export const DEFAULT_FUEL_COST = {
  cargo_van: 0.25,
  box_truck: 0.45,
  dry_van: 0.65,
  reefer: 0.75,
  flatbed: 0.65,
};
