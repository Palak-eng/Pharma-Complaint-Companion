import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getComplaintApi, updateComplaintApi, type ComplaintResponse } from "@/lib/api";

export const Route = createFileRoute("/complaints/$complaintId")({
  head: ({ params }) => ({
    meta: [
      { title: `Complaint ${params.complaintId} | Pharma QMS` },
      { name: "description", content: "View and edit complaint details" },
    ],
  }),
  component: ComplaintDetail,
});

function ComplaintDetail() {
  const { complaintId } = Route.useParams();
  const [complaint, setComplaint] = useState<ComplaintResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, unknown>>({});

  useEffect(() => {
    async function load() {
      try {
        const data = await getComplaintApi(complaintId);
        setComplaint(data);
      } catch {
        toast.error("Load failed", { description: "Could not load complaint." });
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [complaintId]);

  function handleChange(field: string, value: string) {
    setEditedFields((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (Object.keys(editedFields).length === 0) {
      toast.info("No changes", { description: "Nothing to save." });
      return;
    }
    setSaving(true);
    try {
      const updated = await updateComplaintApi(complaintId, editedFields);
      setComplaint(updated);
      setEditedFields({});
      toast.success("Saved", { description: "Complaint updated successfully." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update";
      toast.error("Save failed", { description: message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Complaint not found</h1>
          <Link to="/" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="size-4" /> Back to form
          </Link>
        </div>
      </div>
    );
  }

  function getField(field: keyof ComplaintResponse) {
    return (editedFields[field] as string) ?? complaint?.[field] ?? "";
  }

  function FieldInput({
    field,
    label,
    type = "text",
  }: {
    field: keyof ComplaintResponse;
    label: string;
    type?: string;
  }) {
    return (
      <div>
        <label className="field-label">{label}</label>
        <input
          type={type}
          className="field-input"
          value={getField(field)}
          onChange={(e) => handleChange(field, e.target.value)}
        />
      </div>
    );
  }

  function FieldSelect({
    field,
    label,
    options,
  }: {
    field: keyof ComplaintResponse;
    label: string;
    options: string[];
  }) {
    return (
      <div>
        <label className="field-label">{label}</label>
        <select
          className="field-input"
          value={getField(field)}
          onChange={(e) => handleChange(field, e.target.value)}
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary"
            >
              <ArrowLeft className="size-4" /> Back
            </Link>
            <h1 className="text-2xl font-bold">{complaint.complaint_id}</h1>
            <span className="rounded-md border border-info/50 bg-info/10 px-2 py-0.5 text-xs font-bold text-info">
              {complaint.status || "Open"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || Object.keys(editedFields).length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Changes
          </button>
        </div>

        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <h2 className="section-title">Customer &amp; Complaint Details</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldInput field="customer_name" label="Customer Name" />
            <FieldInput field="complaint_source" label="Complaint Source" />
            <FieldInput field="complaint_date" label="Complaint Date" type="date" />
            <FieldSelect
              field="status"
              label="Status"
              options={["Open", "In Review", "Resolved", "Closed"]}
            />
          </div>
        </div>

        <div className="mt-6 space-y-6 rounded-lg border border-border bg-card p-6">
          <h2 className="section-title">Product &amp; Batch</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldInput field="product_name" label="Product Name" />
            <FieldInput field="product_strength" label="Product Strength" />
            <FieldInput field="batch_number" label="Batch Number" />
            <FieldInput field="manufacturing_date" label="Manufacturing Date" type="date" />
            <FieldInput field="expiry_date" label="Expiry Date" type="date" />
            <FieldInput field="quantity_affected" label="Quantity Affected" />
          </div>
        </div>

        <div className="mt-6 space-y-6 rounded-lg border border-border bg-card p-6">
          <h2 className="section-title">Complaint Classification</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldSelect
              field="complaint_type"
              label="Complaint Type"
              options={[
                "Product Quality",
                "Packaging Defect",
                "Labeling Error",
                "Contamination",
                "Shortage/Quantity",
                "Adverse Event",
                "Documentation",
                "Other",
              ]}
            />
            <FieldSelect
              field="initial_severity"
              label="Initial Severity"
              options={["Critical", "Major", "Minor"]}
            />
            <FieldSelect field="priority" label="Priority" options={["High", "Medium", "Low"]} />
            <FieldSelect
              field="risk_class"
              label="Risk Class"
              options={["Critical", "High", "Medium", "Low"]}
            />
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea
              rows={4}
              className="field-input"
              value={getField("description")}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>
        </div>

        {complaint.risk_summary ? (
          <div className="mt-6 space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 className="section-title">AI Assessment</h2>
            <div>
              <span className="field-label">Risk Summary</span>
              <p className="text-sm">{complaint.risk_summary}</p>
            </div>
            <div>
              <span className="field-label">Risk Rationale</span>
              <p className="text-sm text-muted-foreground">{complaint.risk_rationale}</p>
            </div>
            {complaint.ai_summary ? (
              <div>
                <span className="field-label">AI Summary</span>
                <p className="text-sm">{complaint.ai_summary}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="section-title">Metadata</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Created: </span>
              {complaint.created_at}
            </div>
            <div>
              <span className="text-muted-foreground">Updated: </span>
              {complaint.updated_at}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
