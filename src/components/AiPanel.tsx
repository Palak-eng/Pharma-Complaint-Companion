import { useCallback, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Search,
  Send,
  ShieldAlert,
  UploadCloud,
  Wrench,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  extractionFailed,
  extractionSuccess,
  pushChat,
  setChatPending,
  setProgress,
  setRootCause,
  setDuplicates,
  setCapa,
  setAiSummary,
  setCompleteness,
  startExtraction,
} from "@/store/complaintSlice";
import {
  extractComplaintApi,
  askAssistantApi,
  analyzeRootCauseApi,
  checkDuplicatesApi,
  generateCAPAApi,
  generateSummaryApi,
  checkCompletenessApi,
} from "@/lib/api";
import { SAMPLE_COMPLAINT } from "@/lib/sample-complaint";

async function readFileText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  if (file.name.toLowerCase().endsWith(".pdf")) {
    const raw = new TextDecoder("latin1").decode(buf);
    const matches = raw.match(/\((?:\\.|[^()\\])*\)/g) ?? [];
    const text = matches
      .map((m) => m.slice(1, -1).replace(/\\([()\\])/g, "$1"))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 20) {
      throw new Error(
        "Could not extract readable text from this PDF. It may be scanned/image-based. Please paste the complaint text instead.",
      );
    }
    return text;
  }
  return new TextDecoder("utf-8").decode(buf);
}

function RiskBadge({ level }: { level: string }) {
  const tone =
    level === "Critical" || level === "High"
      ? "border-destructive/50 bg-destructive/10 text-destructive"
      : level === "Medium"
        ? "border-warning/50 bg-warning/15 text-warning-foreground"
        : "border-success/50 bg-success/15 text-success";
  return (
    <span
      className={`rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${tone}`}
    >
      {level || "—"}
    </span>
  );
}

function List({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h4>
      <ul className="space-y-1 text-sm text-foreground">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-primary">•</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="border-t border-border px-4 py-3">{children}</div> : null}
    </div>
  );
}

export function AiPanel() {
  const dispatch = useAppDispatch();
  const {
    status,
    progress,
    progressLabel,
    error,
    assessment,
    sourceName,
    chat,
    chatPending,
    fields,
    rootCause,
    duplicates,
    capa,
    aiSummary,
    completeness,
  } = useAppSelector((s) => s.complaint);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [question, setQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      const text = await readFileText(file);
      void run(text, file.name);
    } catch (err) {
      dispatch(extractionFailed(err instanceof Error ? err.message : "Failed to read file"));
    }
  }

  async function run(text: string, name: string) {
    if (text.trim().length < 20) {
      dispatch(
        extractionFailed(
          "Could not read enough text from that source. Paste the complaint text instead.",
        ),
      );
      return;
    }
    dispatch(startExtraction({ text, name }));
    const timer = setInterval(() => {
      dispatch(setProgress({ value: Math.min(92, progressFake()) }));
    }, 700);
    let tick = 8;
    function progressFake() {
      tick = Math.min(92, tick + Math.random() * 14);
      return Math.round(tick);
    }
    try {
      dispatch(
        setProgress({ value: 22, label: "Analyzing document content and extracting key details…" }),
      );
      const result = await extractComplaintApi(text);
      clearInterval(timer);
      dispatch(extractionSuccess(result));
      dispatch(
        pushChat({
          role: "assistant",
          content: `I extracted the complaint from **${name}** and populated the form. ${result.assessment.summary}`,
        }),
      );
    } catch (e) {
      clearInterval(timer);
      dispatch(extractionFailed(e instanceof Error ? e.message : "Extraction failed"));
    }
  }

  async function ask() {
    const q = question.trim();
    if (!q || chatPending) return;
    setQuestion("");
    dispatch(pushChat({ role: "user", content: q }));
    dispatch(setChatPending(true));
    try {
      const ctx = JSON.stringify({ fields, assessment });
      const { answer } = await askAssistantApi(q, ctx);
      dispatch(pushChat({ role: "assistant", content: answer }));
    } catch {
      dispatch(
        pushChat({ role: "assistant", content: "Sorry, I couldn't answer that right now." }),
      );
    } finally {
      dispatch(setChatPending(false));
    }
  }

  async function runRootCause() {
    setAiLoading("rootCause");
    try {
      const result = await analyzeRootCauseApi(fields);
      dispatch(setRootCause(result));
    } catch {
      dispatch(pushChat({ role: "assistant", content: "Root cause analysis failed." }));
    } finally {
      setAiLoading(null);
    }
  }

  async function runDuplicateCheck() {
    setAiLoading("duplicates");
    try {
      const result = await checkDuplicatesApi(fields);
      dispatch(setDuplicates(result));
    } catch {
      dispatch(pushChat({ role: "assistant", content: "Duplicate check failed." }));
    } finally {
      setAiLoading(null);
    }
  }

  async function runCAPA() {
    setAiLoading("capa");
    try {
      if (!assessment) return;
      const result = await generateCAPAApi(fields, assessment);
      dispatch(setCapa(result));
    } catch {
      dispatch(pushChat({ role: "assistant", content: "CAPA generation failed." }));
    } finally {
      setAiLoading(null);
    }
  }

  async function runSummary() {
    setAiLoading("summary");
    try {
      if (!assessment) return;
      const result = await generateSummaryApi(fields, assessment);
      dispatch(setAiSummary(result));
    } catch {
      dispatch(pushChat({ role: "assistant", content: "Summary generation failed." }));
    } finally {
      setAiLoading(null);
    }
  }

  async function runCompleteness() {
    setAiLoading("completeness");
    try {
      const result = await checkCompletenessApi(fields);
      dispatch(setCompleteness(result));
    } catch {
      dispatch(pushChat({ role: "assistant", content: "Completeness check failed." }));
    } finally {
      setAiLoading(null);
    }
  }

  const hasData = status === "done" && assessment;

  return (
    <aside className="flex h-full flex-col gap-5 overflow-y-auto border-l border-border bg-surface px-6 py-7">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Bot className="size-5 text-primary" /> AI Complaint Assistant
        </h2>
        <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
          BETA
        </span>
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed bg-card px-6 py-8 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-input hover:border-ring"
        }`}
      >
        <UploadCloud className="mx-auto size-7 text-muted-foreground" />
        <p className="mt-2 text-sm font-semibold">
          {isDragging ? "Drop file here" : "Drag & drop complaint document here"}
        </p>
        <p className="text-sm text-muted-foreground">
          or <span className="font-semibold text-primary">click to browse</span>
        </p>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.txt,.eml,.md,.csv,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const text = await readFileText(file);
            void run(text, file.name);
          } catch (err) {
            dispatch(extractionFailed(err instanceof Error ? err.message : "Failed to read file"));
          }
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={() => setPasteOpen((v) => !v)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
      >
        <FileText className="size-4" /> Paste Complaint Text / Email
      </button>

      {pasteOpen ? (
        <div className="space-y-2">
          <textarea
            rows={7}
            className="field-input"
            placeholder="Paste the complaint email or document text here…"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void run(pasteText, "pasted text")}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Extract with AI
            </button>
            <button
              type="button"
              onClick={() => setPasteText(SAMPLE_COMPLAINT)}
              className="rounded-md border border-input bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Load sample
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-foreground">
        Supported formats: PDF (text-based), TXT, EML, MD · Max file size: 10 MB
      </div>

      {status !== "idle" ? (
        <div className="space-y-2">
          <h3 className="section-title">Extraction Progress</h3>
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-muted-foreground">{progress}%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {progressLabel || (status === "extracting" ? "Working…" : "")}
          </p>
          {sourceName ? (
            <p className="text-xs text-muted-foreground">Source: {sourceName}</p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {assessment ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="section-title">AI Copilot Risk Assessment</h3>
            <RiskBadge level={assessment.risk_class} />
          </div>
          <p className="text-sm">{assessment.summary}</p>
          <p className="text-sm text-muted-foreground">{assessment.risk_rationale}</p>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Completeness</span>
              <span>{assessment.completeness_score}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${assessment.completeness_score}%` }}
              />
            </div>
          </div>

          <List
            icon={<AlertTriangle className="size-3.5" />}
            title="Missing / to verify"
            items={assessment.missing_fields}
          />
          <List
            icon={<Wrench className="size-3.5" />}
            title="Probable root causes"
            items={assessment.probable_root_causes}
          />
          <List
            icon={<CheckCircle2 className="size-3.5" />}
            title="CAPA recommendations"
            items={assessment.capa_recommendations}
          />
          <List
            icon={<ShieldAlert className="size-3.5" />}
            title="Regulatory flags"
            items={assessment.regulatory_flags}
          />
        </div>
      ) : null}

      {hasData ? (
        <div className="space-y-3">
          <h3 className="section-title">AI Analysis Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void runRootCause()}
              disabled={!!aiLoading}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
            >
              {aiLoading === "rootCause" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Search className="size-3.5" />
              )}
              Root Cause
            </button>
            <button
              type="button"
              onClick={() => void runDuplicateCheck()}
              disabled={!!aiLoading}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
            >
              {aiLoading === "duplicates" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Copy className="size-3.5" />
              )}
              Duplicates
            </button>
            <button
              type="button"
              onClick={() => void runCAPA()}
              disabled={!!aiLoading}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
            >
              {aiLoading === "capa" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              CAPA
            </button>
            <button
              type="button"
              onClick={() => void runSummary()}
              disabled={!!aiLoading}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
            >
              {aiLoading === "summary" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileText className="size-3.5" />
              )}
              Summary
            </button>
            <button
              type="button"
              onClick={() => void runCompleteness()}
              disabled={!!aiLoading}
              className="col-span-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
            >
              {aiLoading === "completeness" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <AlertTriangle className="size-3.5" />
              )}
              Completeness Check
            </button>
          </div>

          {rootCause ? (
            <CollapsibleSection
              title="Root Cause Analysis"
              icon={<Wrench className="size-4" />}
              defaultOpen
            >
              <List
                icon={<Wrench className="size-3.5" />}
                title="Probable Causes"
                items={rootCause.probable_causes}
              />
              <List
                icon={<Search className="size-3.5" />}
                title="Investigation Steps"
                items={rootCause.investigation_steps}
              />
            </CollapsibleSection>
          ) : null}

          {duplicates ? (
            <CollapsibleSection
              title="Duplicate Detection"
              icon={<Copy className="size-4" />}
              defaultOpen
            >
              {duplicates.is_duplicate ? (
                <div className="mb-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-sm text-warning-foreground">
                  Potential duplicate detected (confidence:{" "}
                  {Math.round(duplicates.confidence * 100)}%)
                </div>
              ) : (
                <div className="mb-2 rounded-md border border-success/40 bg-success/10 p-2 text-sm text-success">
                  No duplicates found
                </div>
              )}
              {duplicates.similar_complaints.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {duplicates.similar_complaints.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-semibold">{c.complaint_id}</span>
                      <span className="text-muted-foreground">{c.reason}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CollapsibleSection>
          ) : null}

          {capa ? (
            <CollapsibleSection
              title="CAPA Recommendations"
              icon={<CheckCircle2 className="size-4" />}
              defaultOpen
            >
              <List
                icon={<AlertTriangle className="size-3.5" />}
                title="Immediate Actions"
                items={capa.immediate_actions}
              />
              <List
                icon={<Wrench className="size-3.5" />}
                title="Corrective Actions"
                items={capa.corrective_actions}
              />
              <List
                icon={<ShieldAlert className="size-3.5" />}
                title="Preventive Actions"
                items={capa.preventive_actions}
              />
              <List
                icon={<CheckCircle2 className="size-3.5" />}
                title="Regulatory Requirements"
                items={capa.regulatory_requirements}
              />
            </CollapsibleSection>
          ) : null}

          {aiSummary ? (
            <CollapsibleSection
              title="Complaint Summary"
              icon={<FileText className="size-4" />}
              defaultOpen
            >
              <p className="text-sm">{aiSummary.summary}</p>
              <h4 className="mt-2 mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Executive Brief
              </h4>
              <p className="text-sm text-muted-foreground">{aiSummary.executive_brief}</p>
            </CollapsibleSection>
          ) : null}

          {completeness ? (
            <CollapsibleSection
              title="Completeness Check"
              icon={<AlertTriangle className="size-4" />}
              defaultOpen
            >
              <div className="mb-2">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Score</span>
                  <span>{completeness.score}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${completeness.score >= 80 ? "bg-success" : completeness.score >= 50 ? "bg-warning" : "bg-destructive"}`}
                    style={{ width: `${completeness.score}%` }}
                  />
                </div>
              </div>
              <List
                icon={<AlertTriangle className="size-3.5" />}
                title="Missing Fields"
                items={completeness.missing_fields}
              />
              <List
                icon={<CheckCircle2 className="size-3.5" />}
                title="Suggestions"
                items={completeness.suggestions}
              />
            </CollapsibleSection>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto space-y-3 pt-2">
        <h3 className="section-title">AI Assistant</h3>
        <div className="space-y-3">
          {chat.length === 0 ? (
            <div className="flex gap-3 rounded-lg border border-accent bg-accent/50 p-3 text-sm">
              <Bot className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                Upload a complaint document or paste text above. I will extract the details,
                populate the form and assess QMS risk for you.
              </p>
            </div>
          ) : (
            chat.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto w-fit max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[95%] text-sm"
                }
              >
                {m.content}
              </div>
            ))
          )}
          {chatPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Thinking…
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <input
            className="field-input"
            placeholder="Ask me anything about this complaint…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void ask();
            }}
          />
          <button
            type="button"
            onClick={() => void ask()}
            className="rounded-md bg-primary p-2.5 text-primary-foreground hover:opacity-90"
            aria-label="Send question"
          >
            <Send className="size-4" />
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          AI responses may contain errors. Please verify information.
        </p>
      </div>
    </aside>
  );
}
