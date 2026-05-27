"""Out-of-scope detection. v1: rule-based keyword bank. v2: small LLM call."""
import re

# Order matters — first match wins.
_DENY_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("medical", re.compile(r"\b(medicine|medication|symptom|disease|doctor|prescription|dosage|pregnan)\b", re.I)),
    ("legal", re.compile(r"\b(lawsuit|legal advice|sue|contract dispute|court case|attorney)\b", re.I)),
    ("financial_advice", re.compile(r"\b(invest in|stock pick|crypto buy|trading strategy|portfolio allocation)\b", re.I)),
    ("political", re.compile(r"\b(election|political party|vote for|government policy debate)\b", re.I)),
    ("personal", re.compile(r"\b(my relationship|girlfriend|boyfriend|breakup|dating)\b", re.I)),
]

_ALLOW_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("scholarship", re.compile(r"\b(scholarship|grant|funding|tuition waiver|stipend)\b", re.I)),
    (
        "visa_info",
        re.compile(
            r"\b(visa|student permit|study permit|i-?20|cas|coe|immiaccount|sop|statement of purpose)\b",
            re.I,
        ),
    ),
    (
        "documents",
        re.compile(
            r"\b(document|documents|checklist|transcript|certificate|ielts|toefl|pte|gre|gmat|sat)\b",
            re.I,
        ),
    ),
    (
        "study_abroad",
        re.compile(
            r"\b(study abroad|study in|study at|abroad|overseas|university|college|admission|admissions|apply|application|intake|ucas|common app|degree|masters|bachelor|uk|united kingdom|australia|canada|usa|united states|germany|new zealand)\b",
            re.I,
        ),
    ),
    ("education", re.compile(r"\b(education|course|program|programme|major|field|career|tuition)\b", re.I)),
]


def classify_scope(query: str) -> str:
    """Return a scope label. Deny patterns checked first."""
    for label, pat in _DENY_PATTERNS:
        if pat.search(query):
            return label
    for label, pat in _ALLOW_PATTERNS:
        if pat.search(query):
            return label
    return "unknown"
