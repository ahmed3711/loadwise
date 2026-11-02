"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";

// Shared "delete a row" logic used by the carriers, vehicles and loads tables.
// 1. askToDelete(row) opens the confirmation pop-up
// 2. confirmDelete() deletes the row in Supabase and refreshes the table
export function useDeleteRow(tableName) {
  const router = useRouter();
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }

  async function confirmDelete(successText) {
    setDeleting(true);
    const supabase = createClient();

    // .select() returns the deleted rows, so we can tell if anything was deleted
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", rowToDelete.id)
      .select("id");

    if (error) {
      setMessage({ type: "error", text: friendlyDbError(error) });
    } else if (!data || data.length === 0) {
      // Row Level Security silently blocks rows you don't own
      setMessage({ type: "error", text: "You don't have permission to delete this." });
    } else {
      setMessage({ type: "success", text: successText });
    }

    setDeleting(false);
    setRowToDelete(null);
    router.refresh(); // reload the table data from the server
  }

  return {
    rowToDelete,
    askToDelete: (row) => {
      setMessage(null);
      setRowToDelete(row);
    },
    cancelDelete: () => setRowToDelete(null),
    confirmDelete,
    deleting,
    message,
  };
}
