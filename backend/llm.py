import os
import logging
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")


def get_llm(model: str | None = None) -> ChatGroq:
    return ChatGroq(
        groq_api_key=GROQ_API_KEY,
        model_name=model or LLM_MODEL,
        temperature=0.3,
        max_tokens=4096,
    )


def call_llm(system_prompt: str, user_prompt: str, model: str | None = None) -> str:
    llm = get_llm(model)
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ]
    response = llm.invoke(messages)
    return response.content
