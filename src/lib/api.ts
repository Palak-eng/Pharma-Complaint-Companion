const API_BASE = import.meta.env["VITE_API_URL"] || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export type ComplaintFields = {
  complaint_source: string;
  customer_name: string;
  product_name: string;
  product_strength: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity_affected: string;
  complaint_type: string;
  complaint_date: string;
  description: string;
  initial_severity: string;
  priority: string;
};

export type Assessment = {
  summary: string;
  risk_class: string;
  risk_rationale: string;
  completeness_score: number;
  missing_fields: string[];
  probable_root_causes: string[];
  capa_recommendations: string[];
  regulatory_flags: string[];
};

export type ExtractionResult = { fields: Partial<ComplaintFields>; assessment: Assessment };
export type AskResult = { answer: string };
export type RiskResult = { risk_class: string; summary: string; rationale: string };
export type RootCauseResult = { probable_causes: string[]; investigation_steps: string[] };
export type DuplicateResult = {
  is_duplicate: boolean;
  similar_complaints: Array<{ complaint_id: string; similarity: string; reason: string }>;
  confidence: number;
};
export type CAPAResult = {
  immediate_actions: string[];
  corrective_actions: string[];
  preventive_actions: string[];
  regulatory_requirements: string[];
};
export type SummaryResult = { summary: string; executive_brief: string };
export type CompletenessResult = { score: number; missing_fields: string[]; suggestions: string[] };

export type ComplaintResponse = {
  id: number;
  complaint_id: string;
  complaint_source: string;
  customer_name: string;
  product_name: string;
  product_strength: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity_affected: string;
  complaint_type: string;
  complaint_date: string;
  description: string;
  initial_severity: string;
  priority: string;
  status: string;
  risk_class: string;
  risk_summary: string;
  risk_rationale: string;
  completeness_score: number;
  missing_fields: string[];
  probable_root_causes: string[];
  capa_recommendations: string[];
  regulatory_flags: string[];
  ai_summary: string;
  source_text: string;
  source_name: string;
  created_at: string;
  updated_at: string;
};

export async function extractComplaintApi(text: string): Promise<ExtractionResult> {
  return apiFetch("/api/ai/extract", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function askAssistantApi(question: string, context: string): Promise<AskResult> {
  return apiFetch("/api/ai/ask", {
    method: "POST",
    body: JSON.stringify({ question, context }),
  });
}

export async function assessRiskApi(fields: ComplaintFields): Promise<RiskResult> {
  return apiFetch("/api/ai/risk", {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
}

export async function analyzeRootCauseApi(fields: ComplaintFields): Promise<RootCauseResult> {
  return apiFetch("/api/ai/root-cause", {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
}

export async function checkDuplicatesApi(fields: ComplaintFields): Promise<DuplicateResult> {
  return apiFetch("/api/ai/duplicates", {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
}

export async function generateCAPAApi(
  fields: ComplaintFields,
  assessment: Assessment,
): Promise<CAPAResult> {
  return apiFetch("/api/ai/capa", {
    method: "POST",
    body: JSON.stringify({ fields, assessment }),
  });
}

export async function generateSummaryApi(
  fields: ComplaintFields,
  assessment: Assessment,
): Promise<SummaryResult> {
  return apiFetch("/api/ai/summary", {
    method: "POST",
    body: JSON.stringify({ fields, assessment }),
  });
}

export async function checkCompletenessApi(fields: ComplaintFields): Promise<CompletenessResult> {
  return apiFetch("/api/ai/completeness", {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
}

export async function saveComplaintApi(data: Record<string, unknown>): Promise<ComplaintResponse> {
  return apiFetch("/api/complaints/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getComplaintsApi(
  skip = 0,
  limit = 50,
  options?: { status?: string; risk_class?: string; sort_by?: string; sort_order?: string },
): Promise<ComplaintResponse[]> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (options?.status) params.set("status", options.status);
  if (options?.risk_class) params.set("risk_class", options.risk_class);
  if (options?.sort_by) params.set("sort_by", options.sort_by);
  if (options?.sort_order) params.set("sort_order", options.sort_order);
  return apiFetch(`/api/complaints/?${params.toString()}`);
}

export async function getComplaintApi(complaintId: string): Promise<ComplaintResponse> {
  return apiFetch(`/api/complaints/${complaintId}`);
}

export async function updateComplaintApi(
  complaintId: string,
  data: Record<string, unknown>,
): Promise<ComplaintResponse> {
  return apiFetch(`/api/complaints/${complaintId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteComplaintApi(complaintId: string): Promise<{ message: string }> {
  return apiFetch(`/api/complaints/${complaintId}`, {
    method: "DELETE",
  });
}

export async function getComplaintCountApi(options?: {
  status?: string;
  risk_class?: string;
}): Promise<{ count: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.risk_class) params.set("risk_class", options.risk_class);
  const qs = params.toString();
  return apiFetch(`/api/complaints/count${qs ? `?${qs}` : ""}`);
}

export async function searchComplaintsApi(q: string): Promise<ComplaintResponse[]> {
  return apiFetch(`/api/complaints/search?q=${encodeURIComponent(q)}`);
}

export function exportComplaintsToCSV(complaints: ComplaintResponse[]): string {
  const headers = [
    "complaint_id",
    "customer_name",
    "product_name",
    "batch_number",
    "complaint_type",
    "complaint_date",
    "initial_severity",
    "priority",
    "status",
    "risk_class",
    "description",
    "created_at",
  ];
  const rows = complaints.map((c) =>
    headers
      .map((h) => {
        const val = String(c[h as keyof ComplaintResponse] ?? "");
        return val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      })
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
