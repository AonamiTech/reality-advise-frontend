"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { confirmLeadImportAction, getLeadImportAction, uploadLeadImportAction } from "@/lib/actions/lead-import";
import type { LeadImport, LeadImportRow } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;

function statusClass(status: LeadImportRow["status"]) {
  return status === "PENDING" ? "bg-success-soft text-success" : status === "DUPLICATE" ? "bg-warning-soft text-warning" : status === "IMPORTED" ? "bg-success-soft text-success" : status === "INVALID" || status === "FAILED" ? "bg-destructive-soft text-destructive" : "bg-muted text-muted-foreground";
}

function statusLabel(status: LeadImportRow["status"]) {
  return status[0] + status.slice(1).toLowerCase();
}

function downloadErrors(rows: LeadImportRow[]) {
  const errors = rows.filter((row) => row.status === "INVALID" || row.status === "DUPLICATE" || row.status === "FAILED");
  const csv = [
    ["Excel Row Number", "Name", "Mobile", "Email", "Property", "Source", "Status", "Error Message"],
    ...errors.map((row) => [row.excelRowNumber, row.name, row.mobile, row.email, row.property, row.source, row.status, row.errorMessage]),
  ].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "lead-import-errors.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  const csv = "name,mobile,email,propertyName,source,manualSubSource,leadType,enquiryType,budget,requirement,message,externalLeadId\nRahul Sharma,9876543210,rahul@example.com,Green Valley Residency,MANUAL,WALK_IN,INDIVIDUAL,BUY,2500000,2 BHK,Interested in property,MANUAL-001\n";
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "realtyadwise-leads-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function LeadImportWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<LeadImport | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!importData || (importData.status !== "PROCESSING")) return;
    const timer = window.setInterval(() => {
      void getLeadImportAction(importData.importId).then((result) => {
        if (result.ok) setImportData(result.import);
        else setMessage(result.message);
      });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [importData]);

  function choose(next: File | undefined) {
    setMessage(null);
    if (!next) return setFile(null);
    const extension = next.name.toLowerCase().split(".").pop();
    if (!extension || !["csv", "xlsx"].includes(extension)) return setMessage("Only CSV and XLSX files are supported");
    if (next.size > MAX_BYTES) return setMessage("File must be at most 10 MB");
    setFile(next);
  }

  function upload() {
    if (!file) return setMessage("CSV or XLSX file is required");
    const body = new FormData();
    body.append("file", file);
    setMessage(null);
    startTransition(async () => {
      const result = await uploadLeadImportAction(body);
      if (result.ok) {
        setImportData(result.import);
        if (result.import.summary.validRows > 0) setConfirmOpen(true);
        else setMessage("No valid leads found in this file.");
      }
      else setMessage(result.message);
    });
  }

  function confirm() {
    if (!importData || importData.summary.validRows === 0) return;
    setConfirmOpen(false);
    setMessage(null);
    startTransition(async () => {
      const result = await confirmLeadImportAction(importData.importId);
      if (result.ok) setImportData(result.import);
      else setMessage(result.message);
    });
  }

  const processing = importData?.status === "PROCESSING";
  const finished = importData?.status === "COMPLETED" || importData?.status === "COMPLETED_WITH_ERRORS";
  return (
    <div className="grid gap-6">
      <div className="page-head">
        <div><Link className="back" href="/admin/leads"><span aria-hidden="true">←</span> All Leads</Link><h1>Upload leads</h1><p className="muted">Import up to 5,000 leads from a CSV or XLSX file.</p></div>
        <button type="button" className="btn btn-line" onClick={downloadTemplate}>Download template</button>
      </div>
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2>Choose a file</h2><p className="muted text-sm">CSV or XLSX · maximum 10 MB</p></div><label className="btn btn-line cursor-pointer"><input ref={inputRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => choose(event.target.files?.[0])} /> Browse files</label></div>
        <div className="mt-4 rounded-xl border border-dashed border-border-strong bg-muted/20 p-5 text-sm">{file ? <div className="flex flex-wrap items-center justify-between gap-3"><span className="font-medium">{file.name}</span><span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span></div> : <p className="text-muted-foreground">Select a CSV or XLSX file to upload.</p>}</div>
        {message && <p className="notice notice-error mt-4" role="alert">{message}</p>}
        <div className="mt-4"><button type="button" className="btn btn-solid" onClick={upload} disabled={!file || pending}><span>{pending ? "Uploading…" : "Upload file"}</span></button></div>
      </section>
      {importData && (processing || finished) && <ImportResult data={importData} onErrors={() => downloadErrors(importData.rows)} onUploadAnother={() => { setFile(null); setImportData(null); setConfirmOpen(false); setMessage(null); if (inputRef.current) inputRef.current.value = ""; }} />}
      {importData && confirmOpen && <ConfirmImportDialog data={importData} pending={pending} onConfirm={confirm} onCancel={() => setConfirmOpen(false)} />}
    </div>
  );
}

function ImportResult({ data, onErrors, onUploadAnother }: { data: LeadImport; onErrors: () => void; onUploadAnother: () => void }) {
  const summary = data.summary;
  const hasErrors = data.rows.some((row) => row.status === "INVALID" || row.status === "DUPLICATE" || row.status === "FAILED");
  return <section className="panel"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2>Import result</h2><p className="muted text-sm">Status: {data.status.replaceAll("_", " ")}{data.status === "PROCESSING" ? " · Checking progress…" : ""}</p></div>{hasErrors && <button type="button" className="btn btn-line btn-sm" onClick={onErrors}>Download error rows</button>}</div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Total rows" value={summary.totalRows} /><Metric label="Imported" value={summary.imported ?? 0} /><Metric label="Duplicates" value={summary.duplicates ?? summary.duplicateRows} /><Metric label="Invalid" value={summary.invalid ?? summary.invalidRows} /></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Failed" value={summary.failed ?? 0} /><Metric label="Valid rows" value={summary.validRows} /><Metric label="Duplicate rows" value={summary.duplicateRows} /></div><div className="mt-5 flex flex-wrap gap-2"><Link className="btn btn-solid" href="/admin/leads">View leads</Link><button type="button" className="btn btn-line" onClick={onUploadAnother}>Upload another file</button></div></section>;
}

function ConfirmImportDialog({ data, pending, onConfirm, onCancel }: { data: LeadImport; pending: boolean; onConfirm: () => void; onCancel: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-overlay px-4" role="presentation"><div className="w-full max-w-md rounded-xl border border-border bg-surface-elevated p-5 shadow-lg" role="dialog" aria-modal="true" aria-labelledby="confirm-import-title"><h2 id="confirm-import-title" className="font-display text-lg font-semibold">Confirm import</h2><p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{data.summary.validRows} valid leads will be added.{"\\n"}{data.summary.invalidRows} invalid rows will be skipped.{"\\n"}{data.summary.duplicateRows} duplicate leads will be skipped.{"\\n\\n"}Do you want to continue?</p><div className="mt-5 flex justify-end gap-2"><button type="button" className="btn btn-line" onClick={onCancel} disabled={pending}>Cancel</button><button type="button" className="btn btn-solid" onClick={onConfirm} disabled={pending}>{pending ? "Importing…" : "Confirm import"}</button></div></div></div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-border bg-muted/20 p-3"><span className="text-xs text-muted-foreground">{label}</span><strong className="num mt-1 block text-2xl">{value}</strong></div>;
}
