from app.journal_service import list_journals
from app.gemini_service import (
    GeminiQuotaError,
    get_gemini_client,
    GEMINI_MODEL,
    SYSTEM_INSTRUCTION,
    is_quota_error,
)


def generate_insights(uid):
    journals = list_journals(uid)

    if not journals:
        raise ValueError(
            "No journal entries available"
        )

    entries = []

    for journal in journals[:20]:
        entries.append(
            f"TITLE: {journal.get('title', '')}\n"
            f"CONTENT: {journal.get('content', '')}"
        )

    prompt = """
Analyze these personal journal entries.

Write the response in exactly these five clearly
labelled sections:

KEY REFLECTION
Give one simple overall reflection that a normal
person can immediately understand.

RECURRING THEMES
List the most important repeated themes and briefly
explain each one.

POSITIVE PROGRESS
Explain what appears to be improving or developing.

CHALLENGES OR OPEN QUESTIONS
Explain repeated difficulties, uncertainty or unresolved
questions visible in the entries.

NEXT STEP
Give one or two practical next steps.

Rules:
- Use simple, natural human language.
- Do not use markdown tables.
- Do not use separators such as ---.
- Do not use technical analysis language.
- Use only information present in the journals.
- Do not diagnose health conditions.
- Do not invent facts.
- Be concise but meaningful.

Journal entries:
"""

    prompt += "\n\n".join(entries)

    try:
        response = get_gemini_client().models.generate_content(
            model=GEMINI_MODEL,
            contents=[{
                "role": "user",
                "parts": [{"text": prompt}]
            }],
            config={
                "system_instruction": SYSTEM_INSTRUCTION,
                "max_output_tokens": 1400,
            },
        )

    except Exception as exc:
        if is_quota_error(exc):
            raise GeminiQuotaError(
                "Gemini free-tier limit reached"
            ) from exc
        raise

    text = getattr(response, "text", None)

    if not text:
        raise RuntimeError(
            "Gemini returned empty insights"
        )

    return text.strip()
