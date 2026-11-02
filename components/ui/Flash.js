"use client";

import { useEffect } from "react";
import Alert from "./Alert";

// Shows a success message after a redirect (e.g. "/carriers?success=added"),
// then removes "?success=..." from the address bar so it doesn't show again on refresh.
export default function Flash({ message }) {
  useEffect(() => {
    if (message) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [message]);

  return <Alert type="success">{message}</Alert>;
}
