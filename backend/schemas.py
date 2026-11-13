from pydantic import BaseModel
from typing import Optional


class ComplaintFields(BaseModel):
    complaint_source: str = ""
    customer_name: str = ""
    product_name: str = ""
    product_strength: str = ""
    batch_number: str = ""
    manufacturing_date: str = ""
    expiry_date: str = ""
    quantity_affected: str = ""
    complaint_type: str = ""
    complaint_date: str = ""
    description: str = ""
    initial_severity: str = ""
    priority: str = ""


class Assessment(BaseModel):
    summary: str = ""
    risk_class: str = ""
    risk_rationale: str = ""
    completeness_score: float = 0.0
    missing_fields: list[str] = []
    probable_root_causes: list[str] = []
    capa_recommendations: list[str] = []
    regulatory_flags: list[str] = []


class ExtractionRequest(BaseModel):
    text: str


class ExtractionResponse(BaseModel):
    fields: ComplaintFields
    assessment: Assessment


class AskRequest(BaseModel):
    question: str
    context: str


class AskResponse(BaseModel):
    answer: str


class RiskRequest(BaseModel):
    fields: ComplaintFields


class RiskResponse(BaseModel):
    risk_class: str
    summary: str
    rationale: str


class CompletenessRequest(BaseModel):
    fields: ComplaintFields


class CompletenessResponse(BaseModel):
    score: float
    missing_fields: list[str]
    suggestions: list[str]


class RootCauseRequest(BaseModel):
    fields: ComplaintFields


class RootCauseResponse(BaseModel):
    probable_causes: list[str]
    investigation_steps: list[str]


class DuplicateCheckRequest(BaseModel):
    fields: ComplaintFields


class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    similar_complaints: list[dict]
    confidence: float


class CAPARequest(BaseModel):
    fields: ComplaintFields
    assessment: Assessment


class CAPAResponse(BaseModel):
    immediate_actions: list[str]
    corrective_actions: list[str]
    preventive_actions: list[str]
    regulatory_requirements: list[str]


class SummaryRequest(BaseModel):
    fields: ComplaintFields
    assessment: Assessment


class SummaryResponse(BaseModel):
    summary: str
    executive_brief: str


class ComplaintCreate(BaseModel):
    complaint_source: str = ""
    customer_name: str = ""
    product_name: str = ""
    product_strength: str = ""
    batch_number: str = ""
    manufacturing_date: str = ""
    expiry_date: str = ""
    quantity_affected: str = ""
    complaint_type: str = ""
    complaint_date: str = ""
    description: str = ""
    initial_severity: str = ""
    priority: str = ""
    status: str = "Open"
    risk_class: str = ""
    risk_summary: str = ""
    risk_rationale: str = ""
    completeness_score: float = 0.0
    missing_fields: list[str] = []
    probable_root_causes: list[str] = []
    capa_recommendations: list[str] = []
    regulatory_flags: list[str] = []
    ai_summary: str = ""
    source_text: str = ""
    source_name: str = ""


class ComplaintUpdate(BaseModel):
    complaint_source: str | None = None
    customer_name: str | None = None
    product_name: str | None = None
    product_strength: str | None = None
    batch_number: str | None = None
    manufacturing_date: str | None = None
    expiry_date: str | None = None
    quantity_affected: str | None = None
    complaint_type: str | None = None
    complaint_date: str | None = None
    description: str | None = None
    initial_severity: str | None = None
    priority: str | None = None
    status: str | None = None
    risk_class: str | None = None
    risk_summary: str | None = None
    risk_rationale: str | None = None
    completeness_score: float | None = None
    missing_fields: list[str] | None = None
    probable_root_causes: list[str] | None = None
    capa_recommendations: list[str] | None = None
    regulatory_flags: list[str] | None = None
    ai_summary: str | None = None


class ComplaintResponse(BaseModel):
    id: int
    complaint_id: str
    complaint_source: str
    customer_name: str
    product_name: str
    product_strength: str
    batch_number: str
    manufacturing_date: str
    expiry_date: str
    quantity_affected: str
    complaint_type: str
    complaint_date: str
    description: str
    initial_severity: str
    priority: str
    status: str
    risk_class: str
    risk_summary: str
    risk_rationale: str
    completeness_score: float
    missing_fields: list[str]
    probable_root_causes: list[str]
    capa_recommendations: list[str]
    regulatory_flags: list[str]
    ai_summary: str
    source_text: str
    source_name: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
