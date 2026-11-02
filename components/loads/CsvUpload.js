"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { makeLoadSchema, cleanCsvRow, LOAD_CSV_COLUMNS } from "@/lib/validation/load";
import { friendlyDbError } from "@/lib/db-errors";
import { dateFromToday, formatMoney, formatNumber } from "@/lib/format";
import { EQUIPMENT_TYPES, labelFor } from "@/lib/constants";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { DownloadIcon, UploadIcon } from "@/components/icons";

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const MAX_ROWS = 500;

// CSV upload for loads (FR-04):
// 1. only .csv files  2. check the required columns  3. check every row
// with the SAME rules as the load form  4. save the valid rows
// 5. show a table of rejected rows with the reason
export default function CsvUpload() {
  const router = useRouter();
  const fileInput = useRef(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [checking, setChecking] = useState(false);
  const [validRows, setValidRows] = useState([]);
  const [rejectedRows, setRejectedRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  function clearResults() {
    setFileError("");
    setValidRows([]);
    setRejectedRows([]);
    setSaveError("");
    setSavedCount(0);
  }

  function handleFileChosen(event) {
    clearResults();
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    // Rule 1: only .csv files, not empty, not too big
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Only .csv files are allowed. In Excel use File → Save As → CSV.");
      return;
    }
    if (file.size === 0) {
      setFileError("This file is empty.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("This file is too big. The maximum size is 1 MB.");
      return;
    }

    setChecking(true);
    Papa.parse(file, {
      header: true, // first line = column names
      skipEmptyLines: "greedy",
      // " Origin City " -> "origin_city"
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (results) => {
        setChecking(false);
        checkRows(results);
      },
      error: (error) => {
        setChecking(false);
        setFileError(`Could not read the file: ${error.message}`);
      },
    });
  }

  function checkRows(results) {
    // Rule 2: all required columns must be present
    const columns = results.meta.fields ?? [];
    const missing = LOAD_CSV_COLUMNS.filter((column) => !columns.includes(column));
    if (missing.length > 0) {
      setFileError(`The file is missing these columns: ${missing.join(", ")}`);
      return;
    }

    const rows = results.data;
    if (rows.length === 0) {
      setFileError("The file has column names but no data rows.");
      return;
    }
    if (rows.length > MAX_ROWS) {
      setFileError(`The file has ${rows.length} rows. Please upload at most ${MAX_ROWS} rows at a time.`);
      return;
    }

    // Rows the CSV reader itself couldn't understand (e.g. too many commas)
    const formatProblems = {};
    (results.errors ?? []).forEach((problem) => {
      if (typeof problem.row === "number") {
        formatProblems[problem.row] = `CSV format problem: ${problem.message}`;
      }
    });

    // Rule 3: check every row with the same Zod rules as the form
    const schema = makeLoadSchema();
    const valid = [];
    const rejected = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 1; // row 1 = first row under the column names
      const cleaned = cleanCsvRow(row);
      const result = schema.safeParse(cleaned);
      const lane = `${cleaned.origin_city || "?"}, ${cleaned.origin_state || "?"} → ${cleaned.destination_city || "?"}, ${cleaned.destination_state || "?"}`;

      if (formatProblems[index]) {
        rejected.push({ rowNumber, lane, reasons: [formatProblems[index]] });
      } else if (result.success) {
        valid.push({ rowNumber, data: result.data });
      } else {
        // One message per field is enough
        const reasons = [];
        const fieldsSeen = new Set();
        result.error.issues.forEach((issue) => {
          const field = issue.path[0];
          if (!fieldsSeen.has(field)) {
            fieldsSeen.add(field);
            reasons.push(issue.message);
          }
        });
        rejected.push({ rowNumber, lane, reasons });
      }
    });

    setValidRows(valid);
    setRejectedRows(rejected);
  }

  // Rule 4: save all valid rows to Supabase in one go
  async function saveValidRows() {
    setSaving(true);
    setSaveError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("loads")
      .insert(validRows.map((row) => row.data))
      .select("id");
    setSaving(false);

    if (error) {
      setSaveError(friendlyDbError(error));
      return;
    }

    setSavedCount(data.length);
    setValidRows([]);
    router.refresh();
  }

  function chooseAnotherFile() {
    clearResults();
    setFileName("");
    if (fileInput.current) fileInput.current.value = "";
  }

  // Builds an example file (dates are always in the future) with 4 good
  // rows and 2 rows that break the rules, so you can see both results
  function downloadSample() {
    const rows = [
      LOAD_CSV_COLUMNS,
      ["Dallas", "TX", "Chicago", "IL", dateFromToday(2), dateFromToday(4), 925, 12000, 10, 20, "dry_van", 2450, "Prairie Freight Brokers", "411443"],
      ["Atlanta", "GA", "Orlando", "FL", dateFromToday(3), dateFromToday(4), 440, 5200, 6, 12, "box_truck", 1150.5, "Sunbelt Logistics", "561135"],
      ["Phoenix", "AZ", "Denver", "CO", dateFromToday(5), dateFromToday(7), 820, 38000, 24, 48, "reefer", 3100, "Summit Cargo Partners", "384859"],
      ["Houston", "TX", "Memphis", "TN", dateFromToday(1), dateFromToday(2), 565, 1800, 3, 8, "cargo_van", 780, "Blue Ridge Brokerage", "350712"],
      ["Miami", "ZZ", "Tampa", "FL", dateFromToday(4), dateFromToday(2), 280, 90000, 4, 10, "dry_van", 650, "Gulf Coast Freight", "12AB"],
      ["", "TX", "Austin", "TX", "2020-01-01", dateFromToday(3), 0, 1000, 40, 10, "spaceship", -50, "X", "123"],
    ];
    const csvText = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvText], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "loadwise-sample-loads.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const hasResults = validRows.length > 0 || rejectedRows.length > 0 || savedCount > 0;

  return (
    <div className="space-y-6">
      {/* Step 1: choose a file */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-navy">1. Choose a CSV file</h2>
            <p className="mt-1 text-sm text-slate-500">
              The first line must contain the column names below. Max 1 MB and {MAX_ROWS} rows.
            </p>
          </div>
          <Button variant="secondary" onClick={downloadSample}>
            <DownloadIcon className="h-4 w-4" /> Download sample CSV
          </Button>
        </div>

        <label
          htmlFor="csv-file"
          className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-surface px-6 py-10 text-center transition hover:border-brand"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-navy">
            <UploadIcon className="h-6 w-6" />
          </span>
          <span className="mt-3 text-sm font-semibold text-navy">
            {fileName ? `Selected: ${fileName}` : "Click to choose a .csv file"}
          </span>
          <span className="mt-1 text-xs text-slate-500">Only .csv files are accepted</span>
          <input
            ref={fileInput}
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChosen}
            className="sr-only"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {LOAD_CSV_COLUMNS.map((column) => (
            <code key={column} className="rounded bg-surface px-2 py-0.5 text-xs text-navy">
              {column}
            </code>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Dates as YYYY-MM-DD or MM/DD/YYYY · states as 2-letter codes · equipment_type is one of:{" "}
          {EQUIPMENT_TYPES.map((type) => type.value).join(", ")}
        </p>

        {checking && (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <span className="text-brand">
              <Spinner size="sm" />
            </span>
            Checking every row…
          </p>
        )}
        {fileError && (
          <div className="mt-4">
            <Alert type="error">{fileError}</Alert>
          </div>
        )}
      </Card>

      {/* Step 2: results */}
      {hasResults && (
        <Card>
          <h2 className="text-base font-semibold text-navy">2. Check the results</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-800">Valid rows</p>
              <p className="text-2xl font-bold text-green-800">{validRows.length + savedCount}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">Rejected rows</p>
              <p className="text-2xl font-bold text-red-700">{rejectedRows.length}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <Alert type="error">{saveError}</Alert>
            {savedCount > 0 && (
              <Alert type="success">
                {savedCount} load{savedCount === 1 ? " was" : "s were"} saved to the database.{" "}
                <Link href="/loads" className="font-semibold underline">
                  View loads →
                </Link>
              </Alert>
            )}
          </div>

          {validRows.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-600">These rows passed every check and are ready to save:</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line p-3 text-sm">
                {validRows.map((row) => (
                  <li key={row.rowNumber} className="flex flex-wrap justify-between gap-2">
                    <span>
                      <span className="text-slate-400">Row {row.rowNumber}:</span> {row.data.origin_city},{" "}
                      {row.data.origin_state} → {row.data.destination_city}, {row.data.destination_state}
                    </span>
                    <span className="text-slate-500">
                      {labelFor(EQUIPMENT_TYPES, row.data.equipment_type)} · {formatNumber(row.data.weight_lbs)} lbs ·{" "}
                      {formatMoney(row.data.rate_usd)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={saveValidRows} loading={saving}>
                  {saving
                    ? "Saving…"
                    : `Save ${validRows.length} valid load${validRows.length === 1 ? "" : "s"}`}
                </Button>
                <Button variant="secondary" onClick={chooseAnotherFile} disabled={saving}>
                  Choose another file
                </Button>
              </div>
            </div>
          )}

          {validRows.length === 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {savedCount > 0 && <LinkButton href="/loads">Go to loads</LinkButton>}
              <Button variant="secondary" onClick={chooseAnotherFile}>
                Upload another file
              </Button>
            </div>
          )}

          {/* Rule 5: table of rejected rows with the reasons */}
          {rejectedRows.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-red-700">
                Rejected rows (not saved). Fix them in your file and upload again.
              </h3>
              <div className="mt-2 overflow-x-auto rounded-xl border border-red-200">
                <table className="min-w-full divide-y divide-red-100 text-sm">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-red-700">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-red-700">Lane</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-red-700">
                        Why it was rejected
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 bg-white">
                    {rejectedRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="px-4 py-2 align-top font-semibold">{row.rowNumber}</td>
                        <td className="whitespace-nowrap px-4 py-2 align-top">{row.lane}</td>
                        <td className="px-4 py-2">
                          <ul className="list-disc space-y-0.5 pl-4 text-red-700">
                            {row.reasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
