"""Thresholds + refusal/clarifying templates. Single source of truth.

Abroadly is opensource student support. Refusals never recommend a
consultancy — they point at the actual professional or the official portal.
"""
from app.core.config import settings

MIN_RETRIEVAL_SCORE = settings.eval_min_retrieval_score
MIN_GROUNDING_SCORE = settings.eval_min_grounding_score
SCOPE_STRICT = settings.eval_scope_strict

# Confidence band below MIN_RETRIEVAL_SCORE where we still try to answer
# with the partial-answer mode (generation runs, but with a stronger
# gap-naming + official-source-pointer system instruction).
PARTIAL_ANSWER_MIN_SCORE = 0.30

ALLOWED_SCOPES = {"study_abroad", "education", "scholarship", "visa_info", "documents"}

# Categories that always refuse, regardless of retrieval score.
DENY_SCOPES = {"medical", "legal", "financial_advice", "personal", "political"}

REFUSAL_TEMPLATES = {
    "medical": (
        "I can only help with study-abroad guidance. For medical questions, "
        "please see a licensed doctor or your nearest hospital."
    ),
    "legal": (
        "I can only help with study-abroad guidance. For legal matters, see a "
        "licensed lawyer. For visa-specific legal questions, immigration "
        "lawyers are searchable on the destination country's bar association "
        "website."
    ),
    "financial_advice": (
        "I can share scholarship, tuition, and cost-of-living info, but not "
        "personal investment advice. For that, talk to a SEBON-registered "
        "financial advisor in Nepal (or the licensed equivalent in your "
        "country)."
    ),
    "personal": (
        "I'm built for study-abroad guidance only. I can't help with personal "
        "or relationship questions."
    ),
    "political": (
        "I don't take positions on political topics. I can help you with the "
        "study-abroad process itself."
    ),
    "default": (
        "I'm not sure I can help with that one. I'm best at study-abroad "
        "questions — things like eligibility, applications, scholarships, "
        "visas, and documents. Try asking me something about studying abroad!"
    ),
}

CLARIFYING_TEMPLATES = {
    "missing_country": (
        "Which country are you targeting? That changes the requirements, the "
        "visa pathway, and the timeline significantly."
    ),
    "missing_level": (
        "What's your current education level — finishing +2 / A-levels / BBA / "
        "completing bachelors? The answer depends on your starting point."
    ),
    "low_evidence": (
        "I don't have confident information on that specific point. Can you "
        "share a bit more — which university, which intake, or which course "
        "level — so I can either find the right answer or point you to the "
        "official source?"
    ),
    "missing_field": (
        "What field do you want to study? Engineering, business, nursing, IT, "
        "and others have very different requirements and visa pathways."
    ),
    "default": (
        "Could you give me a bit more context? I want to ground my answer in "
        "real information, not guess."
    ),
}

# Used when the student asks about something that requires the official
# system (filing visa, paying tuition direct to a university, signing a CoE).
# We do NOT recommend a consultancy. We name the official portal.
ESCALATE_MESSAGE = (
    "This step has to happen on the official government / university portal "
    "— no consultancy or third party can do it for you legitimately. Once you "
    "tell me which country and program you're targeting, I'll point you at "
    "the exact URL and walk you through the documents and content you'll need."
)
