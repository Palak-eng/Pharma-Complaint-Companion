import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

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

export type ChatMessage = { role: "user" | "assistant"; content: string };

export const emptyFields: ComplaintFields = {
  complaint_source: "",
  customer_name: "",
  product_name: "",
  product_strength: "",
  batch_number: "",
  manufacturing_date: "",
  expiry_date: "",
  quantity_affected: "",
  complaint_type: "",
  complaint_date: "",
  description: "",
  initial_severity: "",
  priority: "",
};

type State = {
  fields: ComplaintFields;
  assessment: Assessment | null;
  status: "idle" | "extracting" | "done" | "error";
  progress: number;
  progressLabel: string;
  error: string | null;
  sourceText: string;
  sourceName: string;
  chat: ChatMessage[];
  chatPending: boolean;
  saved: { id: string; fields: ComplaintFields; risk: string }[];
};

const initialState: State = {
  fields: emptyFields,
  assessment: null,
  status: "idle",
  progress: 0,
  progressLabel: "",
  error: null,
  sourceText: "",
  sourceName: "",
  chat: [],
  chatPending: false,
  saved: [],
};

const slice = createSlice({
  name: "complaint",
  initialState,
  reducers: {
    setField(state, a: PayloadAction<{ key: keyof ComplaintFields; value: string }>) {
      state.fields[a.payload.key] = a.payload.value;
    },
    resetForm(state) {
      state.fields = emptyFields;
      state.assessment = null;
      state.status = "idle";
      state.progress = 0;
      state.progressLabel = "";
      state.error = null;
      state.sourceText = "";
      state.sourceName = "";
      state.chat = [];
    },
    startExtraction(state, a: PayloadAction<{ text: string; name: string }>) {
      state.status = "extracting";
      state.progress = 8;
      state.progressLabel = "Reading document and detecting complaint structure…";
      state.error = null;
      state.sourceText = a.payload.text;
      state.sourceName = a.payload.name;
    },
    setProgress(state, a: PayloadAction<{ value: number; label?: string }>) {
      state.progress = a.payload.value;
      if (a.payload.label) state.progressLabel = a.payload.label;
    },
    extractionSuccess(
      state,
      a: PayloadAction<{ fields: Partial<ComplaintFields>; assessment: Assessment }>,
    ) {
      state.fields = { ...emptyFields, ...a.payload.fields };
      state.assessment = a.payload.assessment;
      state.status = "done";
      state.progress = 100;
      state.progressLabel = "Extraction complete. Review and confirm the details.";
    },
    extractionFailed(state, a: PayloadAction<string>) {
      state.status = "error";
      state.error = a.payload;
      state.progress = 0;
      state.progressLabel = "";
    },
    pushChat(state, a: PayloadAction<ChatMessage>) {
      state.chat.push(a.payload);
    },
    setChatPending(state, a: PayloadAction<boolean>) {
      state.chatPending = a.payload;
    },
    saveComplaint(state) {
      const id = `CC-${String(state.saved.length + 1).padStart(4, "0")}`;
      state.saved.push({
        id,
        fields: { ...state.fields },
        risk: state.assessment?.risk_class ?? "—",
      });
    },
  },
});

export const {
  setField,
  resetForm,
  startExtraction,
  setProgress,
  extractionSuccess,
  extractionFailed,
  pushChat,
  setChatPending,
  saveComplaint,
} = slice.actions;

export default slice.reducer;
