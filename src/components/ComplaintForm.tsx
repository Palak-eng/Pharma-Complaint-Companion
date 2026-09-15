import { RotateCcw, Save } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  resetForm,
  saveComplaint,
  setField,
  type ComplaintFields,
} from "@/store/complaintSlice";

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
        <select
          id={name}
          className={cls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
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

function Section({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="section-title mb-4">
        {index}. {title}
      </h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function ComplaintForm() {
  const dispatch = useAppDispatch();
  const saved = useAppSelector((s) => s.complaint.saved);
  const status = useAppSelector((s) => s.complaint.status);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card px-8 py-7">
      <header className="flex flex-wrap items-start justify-between gap-3 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Customer Complaint</h1>
          <p className="mt-1 text-sm text-muted-foreground">API &amp; FDF Quality Assurance Module</p>
        </div>
        <span className="rounded-md border border-warning/50 bg-warning/15 px-3 py-1.5 text-sm font-semibold text-warning-foreground">
          {status === "done" ? "Ready for Triage" : "Pending Triage"}
        </span>
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
          <Field name="initial_severity" label="Initial Severity" options={["Critical", "Major", "Minor"]} />
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
          onClick={() => dispatch(saveComplaint())}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Save className="size-4" /> Save Complaint
        </button>
      </div>

      {saved.length > 0 ? (
        <div className="mt-6 rounded-lg border border-success/40 bg-success/10 p-4">
          <h3 className="section-title mb-2">Logged Complaints</h3>
          <ul className="space-y-1 text-sm">
            {saved.map((s) => (
              <li key={s.id} className="flex flex-wrap gap-2">
                <span className="font-semibold">{s.id}</span>
                <span className="text-muted-foreground">
                  {s.fields.product_name || "Unnamed product"} · Batch {s.fields.batch_number || "—"} · Risk {s.risk}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
