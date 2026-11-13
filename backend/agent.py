import json
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage
from llm import get_llm, LLM_MODEL


class AgentState(TypedDict):
    text: str
    fields: dict
    assessment: dict
    root_causes: list[str]
    capa: list[str]
    summary: str
    completeness_score: float
    missing_fields: list[str]


EXTRACTION_SYSTEM = """You are an AI Complaint Intake Assistant for a pharmaceutical (API & FDF) Quality Management System.
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
"assessment":{"summary":"","risk_class":"","risk_rationale":"","completeness_score":0,"missing_fields":[],"probable_root_causes":[],"capa_recommendations":[],"regulatory_flags":[]}}"""

RISK_SYSTEM = """You are a pharmaceutical QMS risk assessment expert.
Given complaint fields, assess the risk level and provide a brief risk summary.
Return ONLY JSON: {"risk_class":"Critical|High|Medium|Low","summary":"...","rationale":"..."}"""

ROOT_CAUSE_SYSTEM = """You are a pharmaceutical root cause analysis expert.
Given complaint fields, identify probable root causes and investigation steps.
Return ONLY JSON: {"probable_causes":["..."],"investigation_steps":["..."]}"""

CAPA_SYSTEM = """You are a pharmaceutical CAPA (Corrective and Preventive Action) expert.
Given complaint fields and assessment, recommend CAPA actions.
Return ONLY JSON: {"immediate_actions":["..."],"corrective_actions":["..."],"preventive_actions":["..."],"regulatory_requirements":["..."]}"""

SUMMARY_SYSTEM = """You are a pharmaceutical complaint summarization expert.
Given complaint fields and assessment, create a concise summary and executive brief.
Return ONLY JSON: {"summary":"...","executive_brief":"..."}"""

COMPLETENESS_SYSTEM = """You are a QMS completeness checker.
Given complaint fields, evaluate completeness and suggest missing info.
Return ONLY JSON: {"score":0-100,"missing_fields":["..."],"suggestions":["..."]}"""


def _parse_json(text: str) -> dict:
    cleaned = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(cleaned[start:end])
            except json.JSONDecodeError:
                pass
    return {}


def extraction_node(state: AgentState) -> AgentState:
    llm = get_llm()
    messages = [
        SystemMessage(content=EXTRACTION_SYSTEM),
        HumanMessage(content=f"Extract complaint data from this text:\n\n{state['text'][:15000]}"),
    ]
    response = llm.invoke(messages)
    data = _parse_json(response.content)
    return {
        "fields": data.get("fields", {}),
        "assessment": data.get("assessment", {}),
    }


def risk_node(state: AgentState) -> AgentState:
    llm = get_llm()
    messages = [
        SystemMessage(content=RISK_SYSTEM),
        HumanMessage(content=f"Complaint fields: {json.dumps(state['fields'])}"),
    ]
    response = llm.invoke(messages)
    data = _parse_json(response.content)
    assessment = state.get("assessment", {})
    assessment.update({
        "risk_class": data.get("risk_class", assessment.get("risk_class", "")),
        "summary": data.get("summary", assessment.get("summary", "")),
        "risk_rationale": data.get("rationale", assessment.get("risk_rationale", "")),
    })
    return {"assessment": assessment}


def root_cause_node(state: AgentState) -> AgentState:
    llm = get_llm()
    messages = [
        SystemMessage(content=ROOT_CAUSE_SYSTEM),
        HumanMessage(content=f"Complaint fields: {json.dumps(state['fields'])}"),
    ]
    response = llm.invoke(messages)
    data = _parse_json(response.content)
    return {"root_causes": data.get("probable_causes", [])}


def capa_node(state: AgentState) -> AgentState:
    llm = get_llm()
    messages = [
        SystemMessage(content=CAPA_SYSTEM),
        HumanMessage(content=f"Complaint fields: {json.dumps(state['fields'])}\nAssessment: {json.dumps(state.get('assessment', {}))}"),
    ]
    response = llm.invoke(messages)
    data = _parse_json(response.content)
    all_capa = (
        data.get("immediate_actions", [])
        + data.get("corrective_actions", [])
        + data.get("preventive_actions", [])
    )
    assessment = state.get("assessment", {})
    assessment["capa_recommendations"] = all_capa
    assessment["regulatory_flags"] = data.get("regulatory_requirements", [])
    return {"assessment": assessment, "capa": all_capa}


def summary_node(state: AgentState) -> AgentState:
    llm = get_llm()
    messages = [
        SystemMessage(content=SUMMARY_SYSTEM),
        HumanMessage(content=f"Complaint fields: {json.dumps(state['fields'])}\nAssessment: {json.dumps(state.get('assessment', {}))}"),
    ]
    response = llm.invoke(messages)
    data = _parse_json(response.content)
    return {"summary": data.get("summary", "")}


def completeness_node(state: AgentState) -> AgentState:
    llm = get_llm()
    messages = [
        SystemMessage(content=COMPLETENESS_SYSTEM),
        HumanMessage(content=f"Complaint fields: {json.dumps(state['fields'])}"),
    ]
    response = llm.invoke(messages)
    data = _parse_json(response.content)
    assessment = state.get("assessment", {})
    assessment["completeness_score"] = data.get("score", 0)
    assessment["missing_fields"] = data.get("missing_fields", [])
    return {
        "assessment": assessment,
        "completeness_score": data.get("score", 0),
        "missing_fields": data.get("missing_fields", []),
    }


workflow = StateGraph(AgentState)

workflow.add_node("extract", extraction_node)
workflow.add_node("assess_risk", risk_node)
workflow.add_node("root_cause", root_cause_node)
workflow.add_node("capa_analysis", capa_node)
workflow.add_node("summary_node", summary_node)
workflow.add_node("completeness_check", completeness_node)

workflow.set_entry_point("extract")
workflow.add_edge("extract", "assess_risk")
workflow.add_edge("assess_risk", "root_cause")
workflow.add_edge("root_cause", "capa_analysis")
workflow.add_edge("capa_analysis", "summary_node")
workflow.add_edge("summary_node", "completeness_check")
workflow.add_edge("completeness_check", END)

complaint_agent = workflow.compile()


def run_extraction_agent(text: str) -> dict:
    result = complaint_agent.invoke({"text": text})
    fields = result.get("fields", {})
    assessment = result.get("assessment", {})
    assessment["summary"] = result.get("summary", assessment.get("summary", ""))
    return {"fields": fields, "assessment": assessment}


def run_risk_assessment(fields: dict) -> dict:
    llm = get_llm()
    messages = [
        SystemMessage(content=RISK_SYSTEM),
        HumanMessage(content=f"Complaint fields: {json.dumps(fields)}"),
    ]
    response = llm.invoke(messages)
    return _parse_json(response.content)


def run_root_cause_analysis(fields: dict) -> dict:
    llm = get_llm()
    messages = [
        SystemMessage(content=ROOT_CAUSE_SYSTEM),
        HumanMessage(content=f"Complaint fields: {json.dumps(fields)}"),
    ]
    response = llm.invoke(messages)
    return _parse_json(response.content)


def run_duplicate_check(fields: dict, existing_complaints: list[dict]) -> dict:
    llm = get_llm()
    system = """You are a duplicate complaint detection expert.
Compare the new complaint against existing complaints and determine if it's a duplicate.
Return ONLY JSON: {"is_duplicate":bool,"similar_complaints":[{"complaint_id":"...","similarity":"...","reason":"..."}],"confidence":0.0-1.0}"""
    messages = [
        SystemMessage(content=system),
        HumanMessage(content=f"New complaint: {json.dumps(fields)}\n\nExisting complaints: {json.dumps(existing_complaints[:10])}"),
    ]
    response = llm.invoke(messages)
    return _parse_json(response.content)


def run_capa_generation(fields: dict, assessment: dict) -> dict:
    llm = get_llm()
    messages = [
        SystemMessage(content=CAPA_SYSTEM),
        HumanMessage(content=f"Complaint fields: {json.dumps(fields)}\nAssessment: {json.dumps(assessment)}"),
    ]
    response = llm.invoke(messages)
    return _parse_json(response.content)


def run_complaint_summary(fields: dict, assessment: dict) -> dict:
    llm = get_llm()
    messages = [
        SystemMessage(content=SUMMARY_SYSTEM),
        HumanMessage(content=f"Complaint fields: {json.dumps(fields)}\nAssessment: {json.dumps(assessment)}"),
    ]
    response = llm.invoke(messages)
    return _parse_json(response.content)


def run_completeness_check(fields: dict) -> dict:
    llm = get_llm()
    messages = [
        SystemMessage(content=COMPLETENESS_SYSTEM),
        HumanMessage(content=f"Complaint fields: {json.dumps(fields)}"),
    ]
    response = llm.invoke(messages)
    return _parse_json(response.content)
