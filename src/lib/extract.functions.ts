import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ text: z.string().min(10) });

const SYSTEM = `You are an AI Complaint Intake Assistant for a pharmaceutical (API & FDF) Quality Management System.
Extract structured complaint data from the provided document/email text and perform a QMS-style risk assessment.
Rules:
- Only use information present in the text. If a field is absent, return an empty string "".
- Dates must be ISO format YYYY-MM-DD.
- complaint_type is one of: Product Quality, Packaging Defect, Labeling Error, Contamination, Shortage/Quantity, Adverse Event, Documentation, Other.
- initial_severity is one of: Critical, Major, Minor.
- priority is one of: High, Medium, Low.
- risk_class is one of: Critical, High, Medium, Low.
Return ONLY JSON matching this shape:
{"fields":{"complaint_source":"","customer_name":"","product_name":"","product_strength":"","batch_number":"","manufacturing_date":"","expiry_date":"","quantity_affected":"","complaint_type":"","complaint_date":"","description":"","initial_severity":"","priority":""},
"assessment":{"summary":"","risk_class":"","risk_rationale":"","completeness_score":0,"missing_fields":[],"probable_root_causes":[],"capa_recommendations":[],"regulatory_flags":[]}}`;

export const extractComplaint = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env["GOOGLE_AI_API_KEY"];
    if (!key) throw new Error("AI is not configured");

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: data.text.slice(0, 20000) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned) as {
      fields?: Record<string, unknown>;
      assessment?: Record<string, unknown>;
    };
    const f = parsed.fields ?? {};
    const a = parsed.assessment ?? {};
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : []);

    return {
      fields: {
        complaint_source: str(f["complaint_source"]),
        customer_name: str(f["customer_name"]),
        product_name: str(f["product_name"]),
        product_strength: str(f["product_strength"]),
        batch_number: str(f["batch_number"]),
        manufacturing_date: str(f["manufacturing_date"]),
        expiry_date: str(f["expiry_date"]),
        quantity_affected: str(f["quantity_affected"]),
        complaint_type: str(f["complaint_type"]),
        complaint_date: str(f["complaint_date"]),
        description: str(f["description"]),
        initial_severity: str(f["initial_severity"]),
        priority: str(f["priority"]),
      },
      assessment: {
        summary: str(a["summary"]),
        risk_class: str(a["risk_class"]),
        risk_rationale: str(a["risk_rationale"]),
        completeness_score: typeof a["completeness_score"] === "number" ? a["completeness_score"] : 0,
        missing_fields: list(a["missing_fields"]),
        probable_root_causes: list(a["probable_root_causes"]),
        capa_recommendations: list(a["capa_recommendations"]),
        regulatory_flags: list(a["regulatory_flags"]),
      },
    };
  });

const AskInput = z.object({ question: z.string().min(1), context: z.string() });

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AskInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env["GOOGLE_AI_API_KEY"];
    if (!key) throw new Error("AI is not configured");

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a pharmaceutical QMS complaint-handling assistant. Answer briefly (max 5 sentences) using the complaint context provided. Reference GMP/QMS practice where useful.",
          },
          { role: "user", content: `Complaint context:\n${data.context}\n\nQuestion: ${data.question}` },
        ],
      }),
    });

    if (!res.ok) throw new Error(`AI request failed (${res.status})`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { answer: json.choices?.[0]?.message?.content ?? "No answer." };
  });
