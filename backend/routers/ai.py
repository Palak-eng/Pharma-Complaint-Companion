import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas import (
    ExtractionRequest, ExtractionResponse,
    AskRequest, AskResponse,
    RiskRequest, RiskResponse,
    RootCauseRequest, RootCauseResponse,
    DuplicateCheckRequest, DuplicateCheckResponse,
    CAPARequest, CAPAResponse,
    SummaryRequest, SummaryResponse,
    CompletenessRequest, CompletenessResponse,
)
from agent import (
    run_extraction_agent, run_risk_assessment,
    run_root_cause_analysis, run_duplicate_check,
    run_capa_generation, run_complaint_summary,
    run_completeness_check,
)
from llm import call_llm
from crud import get_similar_complaints

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/extract", response_model=ExtractionResponse)
def extract_complaint(req: ExtractionRequest):
    try:
        result = run_extraction_agent(req.text)
        return ExtractionResponse(fields=result["fields"], assessment=result["assessment"])
    except Exception as e:
        logger.exception("Extraction failed")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@router.post("/ask", response_model=AskResponse)
def ask_assistant(req: AskRequest):
    try:
        system = (
            "You are a pharmaceutical QMS complaint-handling assistant. "
            "Answer briefly (max 5 sentences) using the complaint context provided. "
            "Reference GMP/QMS practice where useful."
        )
        user_prompt = f"Complaint context:\n{req.context}\n\nQuestion: {req.question}"
        answer = call_llm(system, user_prompt)
        return AskResponse(answer=answer)
    except Exception as e:
        logger.exception("Ask assistant failed")
        raise HTTPException(status_code=500, detail=f"AI assistant failed: {str(e)}")


@router.post("/risk", response_model=RiskResponse)
def assess_risk(req: RiskRequest):
    try:
        fields_dict = req.fields.model_dump()
        result = run_risk_assessment(fields_dict)
        return RiskResponse(
            risk_class=result.get("risk_class", ""),
            summary=result.get("summary", ""),
            rationale=result.get("rationale", ""),
        )
    except Exception as e:
        logger.exception("Risk assessment failed")
        raise HTTPException(status_code=500, detail=f"Risk assessment failed: {str(e)}")


@router.post("/root-cause", response_model=RootCauseResponse)
def analyze_root_cause(req: RootCauseRequest):
    try:
        fields_dict = req.fields.model_dump()
        result = run_root_cause_analysis(fields_dict)
        return RootCauseResponse(
            probable_causes=result.get("probable_causes", []),
            investigation_steps=result.get("investigation_steps", []),
        )
    except Exception as e:
        logger.exception("Root cause analysis failed")
        raise HTTPException(status_code=500, detail=f"Root cause analysis failed: {str(e)}")


@router.post("/duplicates", response_model=DuplicateCheckResponse)
def check_duplicates(req: DuplicateCheckRequest, db: Session = Depends(get_db)):
    try:
        fields_dict = req.fields.model_dump()
        existing = get_similar_complaints(
            db,
            product_name=fields_dict.get("product_name", ""),
            complaint_type=fields_dict.get("complaint_type", ""),
            batch_number=fields_dict.get("batch_number", ""),
        )
        existing_data = []
        for c in existing:
            existing_data.append({
                "complaint_id": c.complaint_id,
                "product_name": c.product_name,
                "batch_number": c.batch_number,
                "complaint_type": c.complaint_type,
                "description": c.description[:200],
            })
        result = run_duplicate_check(fields_dict, existing_data)
        return DuplicateCheckResponse(
            is_duplicate=result.get("is_duplicate", False),
            similar_complaints=result.get("similar_complaints", []),
            confidence=result.get("confidence", 0.0),
        )
    except Exception as e:
        logger.exception("Duplicate check failed")
        raise HTTPException(status_code=500, detail=f"Duplicate check failed: {str(e)}")


@router.post("/capa", response_model=CAPAResponse)
def generate_capa(req: CAPARequest):
    try:
        fields_dict = req.fields.model_dump()
        assessment_dict = req.assessment.model_dump()
        result = run_capa_generation(fields_dict, assessment_dict)
        return CAPAResponse(
            immediate_actions=result.get("immediate_actions", []),
            corrective_actions=result.get("corrective_actions", []),
            preventive_actions=result.get("preventive_actions", []),
            regulatory_requirements=result.get("regulatory_requirements", []),
        )
    except Exception as e:
        logger.exception("CAPA generation failed")
        raise HTTPException(status_code=500, detail=f"CAPA generation failed: {str(e)}")


@router.post("/summary", response_model=SummaryResponse)
def generate_summary(req: SummaryRequest):
    try:
        fields_dict = req.fields.model_dump()
        assessment_dict = req.assessment.model_dump()
        result = run_complaint_summary(fields_dict, assessment_dict)
        return SummaryResponse(
            summary=result.get("summary", ""),
            executive_brief=result.get("executive_brief", ""),
        )
    except Exception as e:
        logger.exception("Summary generation failed")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")


@router.post("/completeness", response_model=CompletenessResponse)
def check_completeness(req: CompletenessRequest):
    try:
        fields_dict = req.fields.model_dump()
        result = run_completeness_check(fields_dict)
        return CompletenessResponse(
            score=result.get("score", 0),
            missing_fields=result.get("missing_fields", []),
            suggestions=result.get("suggestions", []),
        )
    except Exception as e:
        logger.exception("Completeness check failed")
        raise HTTPException(status_code=500, detail=f"Completeness check failed: {str(e)}")
