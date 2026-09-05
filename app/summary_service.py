from app.journal_service import list_journals
from app.gemini_service import (
    get_gemini_client,
    GEMINI_MODEL,
    SYSTEM_INSTRUCTION,
    is_quota_error,
    GeminiQuotaError,
)

def generate_summary(uid):
    journals = list_journals(uid)

    if not journals:
        raise ValueError("No journal entries available")

    text = "\n\n---\n\n".join(
        f"{j.get('title', '')}\n{j.get('content', '')}"
        for j in journals[:20]
    )

    prompt = f"""
Create a concise, easy-to-understand personal journal summary.

Write the response in exactly these five clearly labelled sections:

OVERALL
Give a short, natural overview of what the journal entries show.

KEY TAKEAWAYS
List the most important themes or takeaways.

WHAT'S IMPROVING
Explain the progress, habits or skills that appear to be developing.

IMPORTANT LEARNINGS
Describe useful lessons visible in the journal entries.

RECOMMENDED FOCUS
Give one practical area of focus or next step.

Rules:
- Use simple, natural human language.
- Do not use markdown tables.
- Do not use separators such as ---.
- Use only information present in the journals.
- Do not invent facts or diagnose the user.
- Be concise but meaningful.

Entries:

{text}
"""

    try:
        response = get_gemini_client().models.generate_content(
            model=GEMINI_MODEL,
            contents=[{
                "role": "user",
                "parts": [{"text": prompt}]
            }],
            config={
                "system_instruction": SYSTEM_INSTRUCTION,
                "max_output_tokens": 1200,
            },
        )
    except Exception as exc:
        if is_quota_error(exc):
            raise GeminiQuotaError(
                "Gemini free-tier limit reached"
            ) from exc
        raise

    result = getattr(response, "text", None)

    if not result:
        raise RuntimeError("Gemini returned empty summary")

    return result.strip()
