import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import Alert from "@/components/ui/Alert";
import Flash from "@/components/ui/Flash";
import BookingsTable from "@/components/bookings/BookingsTable";
import { TargetIcon } from "@/components/icons";

export const metadata = { title: "Bookings" };

const SUCCESS_MESSAGES = {
  booked: "Load booked! It now shows as Booked, and the driver can see it.",
};

// Bookings and their status (FR-13). Drivers see only loads on their
// own vehicle (FR-15), as "My Loads".
export default async function BookingsPage({ searchParams }) {
  const { profile } = await getCurrentUser();
  const { success } = await searchParams;
  const isManager = canManage(profile.role);
  const isDriver = profile.role === "driver";

  const supabase = await createClient();
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "*, loads(*), carriers(company_name), vehicles(plate_number, equipment_type, driver:profiles!driver_id(full_name))"
    )
    .order("booked_at", { ascending: false });

  return (
    <>
      <PageHeader
        title={isDriver ? "My Loads" : "Bookings"}
        description={
          isDriver
            ? "Loads booked on your vehicle. Update the status as you pick up and deliver."
            : "Every booked load from booking to payment: Booked → Picked up → In transit → Delivered → Paid."
        }
        actions={
          isManager && (
            <LinkButton href="/matching">
              <TargetIcon className="h-4 w-4" /> Find loads to book
            </LinkButton>
          )
        }
      />

      <div className="space-y-4">
        <Flash message={SUCCESS_MESSAGES[success]} />
        {error ? (
          <Alert type="error">
            Could not load bookings: {error.message}. If the table is missing, run supabase/schema-part2.sql.
          </Alert>
        ) : (
          <BookingsTable bookings={bookings ?? []} role={profile.role} />
        )}
      </div>
    </>
  );
}
