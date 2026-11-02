import { redirect } from "next/navigation";

// The home page just forwards to the dashboard.
// (proxy.js already sends logged-out users to /login first.)
export default function Home() {
  redirect("/dashboard");
}
