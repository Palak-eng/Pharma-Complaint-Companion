import { useState } from "react";
import { RotateCcw, Save, Loader2, List, ArrowUpDown, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store";
import { resetForm, saveComplaint, setField, type ComplaintFields } from "@/store/complaintSlice";
import {
  saveComplaintApi,
  getComplaintsApi,
  deleteComplaintApi,
  exportComplaintsToCSV,
  downloadCSV,
  type ComplaintResponse,
} from "@/lib/api";
import { validateComplaint } from "@/lib/validation";

const COMPLAINT_TYPES = [
  "Product Quality",
  "Packaging Defect",
  "Labeling Error",
  "Contamination",
  "Shortage/Quantity",
  "Adverse Event",
  "Documentation",
  "Other",
];

const STATUSES = ["Open", "In Review", "Resolved", "Closed"];
const RISK_LEVELS = ["Critical", "High", "Medium", "Low"];
const SORT_OPTIONS = [
  { value: "created_at", label: "Date Created" },
  { value: "updated_at", label: "Date Updated" },
  { value: "risk_class", label: "Risk Level" },
  { value: "status", label: "Status" },
];

function Field({
  name,
  label,
  type = "text",
  suffix,
  options,
  textarea,
}: {
  name: keyof ComplaintFields;
  label: string;
  type?: string;
  suffix?: string;
  options?: string[];
  textarea?: boolean;
}) {
  const dispatch = useAppDispatch();
  const value = useAppSelector((s) => s.complaint.fields[name]);
  const extracting = useAppSelector((s) => s.complaint.status === "extracting");
  const placeholder = extracting ? "Awaiting AI extraction…" : `Enter ${label.toLowerCase()}`;
  const cls = `field-input ${value ? "ai-filled" : ""}`;
  const onChange = (v: string) => dispatch(setField({ key: name, value: v }));

  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      {textarea ? (
        <textarea
          id={name}
          rows={4}
          className={cls}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : options ? (
        <select id={name} className={cls} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-2">
          <input
            id={name}
            type={type}
            className={cls}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {suffix ? (
            <span className="rounded-md border border-input bg-secondary px-3 py-2 text-sm text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="section-title mb-4">
        {index}. {title}
      </h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Open"
      ? "border-info/50 bg-info/10 text-info"
      : status === "In Review"
        ? "border-warning/50 bg-warning/15 text-warning-foreground"
        : status === "Resolved"
          ? "border-success/50 bg-success/15 text-success"
          : "border-muted bg-muted text-muted-foreground";
  return <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${cls}`}>{status}</span>;
}

function RiskBadge({ risk }: { risk: string }) {
  const cls =
    risk === "Critical" || risk === "High"
      ? "border-destructive/50 bg-destructive/10 text-destructive"
      : risk === "Medium"
        ? "border-warning/50 bg-warning/15 text-warning-foreground"
        : "border-success/50 bg-success/15 text-success";
  return (
    <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${cls}`}>{risk || "—"}</span>
  );
}

export function ComplaintForm() {
  const dispatch = useAppDispatch();
  const saved = useAppSelector((s) => s.complaint.saved);
  const status = useAppSelector((s) => s.complaint.status);
  const assessment = useAppSelector((s) => s.complaint.assessment);
  const fields = useAppSelector((s) => s.complaint.fields);
  const sourceText = useAppSelector((s) => s.complaint.sourceText);
  const sourceName = useAppSelector((s) => s.complaint.sourceName);
  const [saving, setSaving] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [dbComplaints, setDbComplaints] = useState<ComplaintResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterRisk, setFilterRisk] = useState<string>("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const PAGE_SIZE = 20;

  async function handleSave() {
    const validation = validateComplaint(fields);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      if (firstError) {
        toast.error("Validation failed", {
          description: `${firstError.path.join(".")}: ${firstError.message}`,
        });
      } else {
        toast.error("Validation failed");
      }
      return;
    }
    setSaving(true);
    try {
      const result = await saveComplaintApi({
        ...fields,
        status: "Open",
        risk_class: assessment?.risk_class ?? "",
        risk_summary: assessment?.summary ?? "",
        risk_rationale: assessment?.risk_rationale ?? "",
        completeness_score: assessment?.completeness_score ?? 0,
        missing_fields: assessment?.missing_fields ?? [],
        probable_root_causes: assessment?.probable_root_causes ?? [],
        capa_recommendations: assessment?.capa_recommendations ?? [],
        regulatory_flags: assessment?.regulatory_flags ?? [],
        ai_summary: assessment?.summary ?? "",
        source_text: sourceText,
        source_name: sourceName,
      });
      dispatch(saveComplaint({ id: result.complaint_id }));
      toast.success("Complaint saved", {
        description: `Complaint ${result.complaint_id} has been saved to the database.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save complaint";
      toast.error("Save failed", { description: message });
      dispatch(saveComplaint());
    } finally {
      setSaving(false);
    }
  }

  async function loadComplaints() {
    setPage(0);
    setHasMore(true);
    try {
      const complaints = await getComplaintsApi(0, PAGE_SIZE, {
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterRisk ? { risk_class: filterRisk } : {}),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setDbComplaints(complaints);
      setHasMore(complaints.length === PAGE_SIZE);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load complaints";
      toast.error("Load failed", { description: message });
    }
  }

  async function loadLog() {
    setShowLog(!showLog);
    if (!showLog) {
      await loadComplaints();
    }
  }

  async function loadMore() {
    const nextPage = page + 1;
    try {
      const complaints = await getComplaintsApi(nextPage * PAGE_SIZE, PAGE_SIZE, {
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterRisk ? { risk_class: filterRisk } : {}),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (complaints.length < PAGE_SIZE) setHasMore(false);
      setDbComplaints((prev) => [...prev, ...complaints]);
      setPage(nextPage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load more";
      toast.error("Load failed", { description: message });
    }
  }

  async function handleDelete(complaintId: string) {
    try {
      await deleteComplaintApi(complaintId);
      setDbComplaints((prev) => prev.filter((c) => c.complaint_id !== complaintId));
      toast.success("Deleted", { description: `Complaint ${complaintId} deleted.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast.error("Delete failed", { description: message });
    }
  }

  function handleFilterChange(
    newStatus: string,
    newRisk: string,
    newSort: string,
    newOrder: "asc" | "desc",
  ) {
    setFilterStatus(newStatus);
    setFilterRisk(newRisk);
    setSortBy(newSort);
    setSortOrder(newOrder);
    setPage(0);
    setHasMore(true);
  }

  function handleExportCSV() {
    if (dbComplaints.length === 0) {
      toast.error("No data", { description: "No complaints to export." });
      return;
    }
    const csv = exportComplaintsToCSV(dbComplaints);
    const date = new Date().toISOString().split("T")[0];
    downloadCSV(csv, `complaints_${date}.csv`);
    toast.success("Exported", {
      description: `${dbComplaints.length} complaints exported to CSV.`,
    });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card px-8 py-7">
      <header className="flex flex-wrap items-start justify-between gap-3 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Customer Complaint</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            API &amp; FDF Quality Assurance Module
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-md border border-warning/50 bg-warning/15 px-3 py-1.5 text-sm font-semibold text-warning-foreground">
            {status === "done" ? "Ready for Triage" : "Pending Triage"}
          </span>
          <button
            type="button"
            onClick={() => void loadLog()}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            <List className="size-4" /> View Log
          </button>
        </div>
      </header>

      <div className="space-y-7">
        <Section index={1} title="Origin &amp; Customer Details">
          <Field name="complaint_source" label="Complaint Source" />
          <Field name="customer_name" label="Customer Name" />
        </Section>

        <Section index={2} title="Product &amp; Batch Identification">
          <Field name="product_name" label="Product Name" />
          <Field name="product_strength" label="Product Strength/Grade" />
          <Field name="batch_number" label="Batch/Lot Number" />
          <Field name="manufacturing_date" label="Manufacturing Date" type="date" />
          <Field name="expiry_date" label="Expiry Date" type="date" />
          <Field name="quantity_affected" label="Quantity Affected" suffix="units" />
        </Section>

        <Section index={3} title="Complaint Details">
          <Field name="complaint_type" label="Complaint Type" options={COMPLAINT_TYPES} />
          <Field name="complaint_date" label="Complaint Date" type="date" />
          <div className="sm:col-span-2">
            <Field name="description" label="Detailed Complaint Description" textarea />
          </div>
        </Section>

        <Section index={4} title="Initial Assessment &amp; Priority">
          <Field
            name="initial_severity"
            label="Initial Severity"
            options={["Critical", "Major", "Minor"]}
          />
          <Field name="priority" label="Priority" options={["High", "Medium", "Low"]} />
        </Section>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => dispatch(resetForm())}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <RotateCcw className="size-4" /> Reset Form
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving…" : "Save Complaint"}
        </button>
      </div>

      {saved.length > 0 ? (
        <div className="mt-6 rounded-lg border border-success/40 bg-success/10 p-4">
          <h3 className="section-title mb-2">Session Complaints</h3>
          <ul className="space-y-1 text-sm">
            {saved.map((s) => (
              <li key={s.id} className="flex flex-wrap gap-2">
                <span className="font-semibold">{s.id}</span>
                <span className="text-muted-foreground">
                  {s.fields.product_name || "Unnamed product"} · Batch{" "}
                  {s.fields.batch_number || "—"} · Risk {s.risk}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showLog ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="section-title mb-2">Database Complaints</h3>

          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <select
              value={filterStatus}
              onChange={(e) => handleFilterChange(e.target.value, filterRisk, sortBy, sortOrder)}
              className="field-input w-auto"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterRisk}
              onChange={(e) => handleFilterChange(filterStatus, e.target.value, sortBy, sortOrder)}
              className="field-input w-auto"
            >
              <option value="">All Risks</option>
              {RISK_LEVELS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) =>
                  handleFilterChange(filterStatus, filterRisk, e.target.value, sortOrder)
                }
                className="field-input w-auto"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  handleFilterChange(
                    filterStatus,
                    filterRisk,
                    sortBy,
                    sortOrder === "asc" ? "desc" : "asc",
                  )
                }
                className="rounded-md border border-input bg-card p-2 hover:bg-secondary"
                aria-label="Toggle sort order"
              >
                <ArrowUpDown className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => void loadComplaints()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary"
            >
              <Download className="size-3.5" /> Export CSV
            </button>
          </div>

          {dbComplaints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No complaints in the database yet.</p>
          ) : (
            <>
              <ul className="space-y-2 text-sm">
                {dbComplaints.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2"
                  >
                    <span className="font-semibold">{c.complaint_id}</span>
                    <span className="text-muted-foreground">
                      {c.product_name || "—"} · Batch {c.batch_number || "—"} ·{" "}
                      {c.complaint_type || "—"}
                    </span>
                    <StatusBadge status={c.status || "Open"} />
                    <RiskBadge risk={c.risk_class} />
                    <button
                      type="button"
                      onClick={() => void handleDelete(c.complaint_id)}
                      className="ml-auto rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${c.complaint_id}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="mt-3 w-full rounded-md border border-input bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  Load more
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
