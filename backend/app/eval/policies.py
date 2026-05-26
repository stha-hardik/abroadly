"""Thresholds + refusal/clarifying templates. Single source of truth."""
from app.core.config import settings

MIN_RETRIEVAL_SCORE = settings.eval_min_retrieval_score
MIN_GROUNDING_SCORE = settings.eval_min_grounding_score
SCOPE_STRICT = settings.eval_scope_strict

ALLOWED_SCOPES = {"study_abroad", "education", "scholarship", "visa_info", "documents"}

# Categories that always refuse, regardless of retrieval score.
DENY_SCOPES = {"medical", "legal", "financial_advice", "personal", "political"}

REFUSAL_TEMPLATES = {
    "medical": "I can only help with study-abroad guidance. For medical questions please consult a doctor.",
    "legal": "I can only help with study-abroad guidance. For legal matters please consult a licensed lawyer.",
    "financial_advice": "I can share scholarship and tuition info, but not personal financial advice.",
    "personal": "I'm built for study-abroad guidance only.",
    "political": "I don't take positions on political topics. I can help with study abroad.",
    "default": "That's outside what I can help with. I'm focused on study-abroad guidance for Nepali students.",
}

CLARIFYING_TEMPLATES = {
    "missing_country": "Which country are you targeting? That changes the answer a lot.",
    "missing_level": "What's your current education level (plus_two / A-levels / BBA / bachelors)?",
    "low_evidence": "I don't have a confident answer on that. Can you share more about your situation?",
    "missing_field": "What field do you want to study?",
    "default": "Could you give me a bit more context? I want to give you a grounded answer, not a guess.",
}

ESCALATE_MESSAGE = (
    "This is a step worth talking to a real consultancy about. Want me to suggest one?"
)
