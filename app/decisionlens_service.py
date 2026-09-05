import json
from datetime import datetime, timezone

from google.cloud import firestore

from app.config import PROJECT_ID
from app.gemini_service import (
    SYSTEM_INSTRUCTION,
    GEMINI_MODEL,
    GeminiQuotaError,
    generate_content_with_retry,
    get_gemini_client,
    is_quota_error,
)

_db = None


def get_db():
    global _db

    if _db is None:
        _db = (
            firestore.Client(project=PROJECT_ID)
            if PROJECT_ID
            else firestore.Client()
        )

    return _db


def decisions_ref(uid):
    return (
        get_db()
        .collection("users")
        .document(uid)
        .collection("decisions")
    )


def decision_ref(uid, decision_id):
    return decisions_ref(uid).document(decision_id)


def _clean(value, default=""):
    return str(
        value if value is not None else default
    ).strip()


def _list(value):
    if isinstance(value, list):
        return [
            _clean(x)
            for x in value
            if _clean(x)
        ]

    if value is None:
        return []

    value = _clean(value)

    return [value] if value else []


def serialize_decision(snapshot):
    data = snapshot.to_dict() or {}

    result = {
        "id": snapshot.id,
        **data,

        # Frontend compatibility aliases.
        # Firestore stores these as ai_analysis / agent_analysis,
        # while DecisionLens UI reads analysis / agent_analysis.
        "analysis": data.get("ai_analysis"),
        "agent_analysis": data.get("agent_analysis"),
    }

    for key in (
        "created_at",
        "updated_at",
        "outcome_recorded_at",
        "ai_analyzed_at",
        "agent_analyzed_at",
    ):
        value = result.get(key)

        if hasattr(value, "isoformat"):
            result[key] = value.isoformat()

    return result


def get_decision(uid, decision_id):
    snapshot = decision_ref(
        uid,
        decision_id
    ).get()

    if not snapshot.exists:
        return None

    data = snapshot.to_dict() or {}

    if data.get("user_id") != uid:
        return None

    return serialize_decision(snapshot)


def list_decisions(uid):
    query = (
        decisions_ref(uid)
        .order_by(
            "updated_at",
            direction=firestore.Query.DESCENDING
        )
    )

    result = []

    for snapshot in query.stream():
        data = snapshot.to_dict() or {}

        if data.get("user_id") != uid:
            continue

        result.append(
            serialize_decision(snapshot)
        )

    return result


def create_decision(uid, payload):
    now = datetime.now(timezone.utc)

    ref = decisions_ref(uid).document()

    title = _clean(
        payload.get("title"),
        "Untitled Decision"
    )

    context = _clean(
        payload.get("context")
    )

    data = {
        "user_id": uid,
        "title": title,
        "context": context,
        "description": context,
        "status": _clean(
            payload.get("status"),
            "open"
        ),
        "priority": _clean(
            payload.get("priority"),
            "medium"
        ),
        "category": _clean(
            payload.get("category"),
            "personal"
        ),
        "options": _list(
            payload.get("options")
        ),
        "criteria": _list(
            payload.get("criteria")
        ),
        "journal_id": payload.get(
            "journal_id"
        ),
        "ai_analysis": None,
        "agent_analysis": None,
        "created_at": now,
        "updated_at": now,
    }

    ref.set(data)

    add_history(
        uid,
        ref.id,
        "decision_created",
        {"title": title}
    )

    return ref.id


def update_decision(
    uid,
    decision_id,
    payload
):
    ref = decision_ref(
        uid,
        decision_id
    )

    snapshot = ref.get()

    if (
        not snapshot.exists
        or (snapshot.to_dict() or {}).get(
            "user_id"
        ) != uid
    ):
        return False

    current = snapshot.to_dict() or {}

    title = _clean(
        payload.get("title"),
        current.get(
            "title",
            "Untitled Decision"
        )
    )

    context = _clean(
        payload.get("context"),
        current.get("context", "")
    )

    changes = {
        "title": title,
        "context": context,
        "description": context,
        "status": _clean(
            payload.get("status"),
            current.get(
                "status",
                "open"
            )
        ),
        "priority": _clean(
            payload.get("priority"),
            current.get(
                "priority",
                "medium"
            )
        ),
        "category": _clean(
            payload.get("category"),
            current.get(
                "category",
                "personal"
            )
        ),
        "options": _list(
            payload.get(
                "options",
                current.get(
                    "options",
                    []
                )
            )
        ),
        "criteria": _list(
            payload.get(
                "criteria",
                current.get(
                    "criteria",
                    []
                )
            )
        ),
        "updated_at": datetime.now(
            timezone.utc
        ),
    }

    ref.update(changes)

    add_history(
        uid,
        decision_id,
        "decision_updated",
        {"title": title}
    )

    return True



def _normalise_actions(value):
    """Return a clean, persistent list of DecisionLens actions."""
    if not isinstance(value, list):
        return []

    result = []

    for item in value:
        if isinstance(item, str):
            action_id = f"action-{len(result) + 1}"
            action = {
                "id": action_id,
                "text": _clean(item),
                "completed": False,
            }
        elif isinstance(item, dict):
            action = {
                "id": _clean(
                    item.get("id"),
                    f"action-{len(result) + 1}"
                ),
                "text": _clean(item.get("text")),
                "completed": bool(
                    item.get("completed", False)
                ),
            }

            if item.get("due_date"):
                action["due_date"] = _clean(
                    item.get("due_date")
                )
        else:
            continue

        if action["text"]:
            result.append(action)

    return result


def update_actions(
    uid,
    decision_id,
    actions
):
    ref = decision_ref(
        uid,
        decision_id
    )

    snapshot = ref.get()

    if (
        not snapshot.exists
        or (snapshot.to_dict() or {}).get("user_id") != uid
    ):
        return None

    cleaned = _normalise_actions(actions)

    ref.update({
        "actions": cleaned,
        "updated_at": datetime.now(timezone.utc),
    })

    add_history(
        uid,
        decision_id,
        "actions_updated",
        {"count": len(cleaned)}
    )

    return cleaned



def update_agent_confirmations(
    uid,
    decision_id,
    confirmations
):
    """
    Persist the information-gap items explicitly confirmed
    by the user.

    Agent analysis and user confirmation are intentionally
    stored separately.
    """
    ref = decision_ref(
        uid,
        decision_id
    )

    snapshot = ref.get()

    if (
        not snapshot.exists
        or (snapshot.to_dict() or {}).get(
            "user_id"
        ) != uid
    ):
        return None

    cleaned = []

    if isinstance(confirmations, list):
        for item in confirmations:
            value = _clean(item)

            if (
                value
                and value not in cleaned
            ):
                cleaned.append(value)

    now = datetime.now(
        timezone.utc
    )

    ref.update({
        "agent_confirmed_items":
            cleaned,

        "agent_confirmed_at":
            now if cleaned else None,

        "updated_at":
            now,
    })

    add_history(
        uid,
        decision_id,
        "agent_insights_confirmed",
        {
            "count":
                len(cleaned),

            "items":
                cleaned,
        }
    )

    return cleaned


def delete_decision(
    uid,
    decision_id
):
    ref = decision_ref(
        uid,
        decision_id
    )

    snapshot = ref.get()

    if (
        not snapshot.exists
        or (snapshot.to_dict() or {}).get(
            "user_id"
        ) != uid
    ):
        return False

    ref.delete()

    return True


def _json_response(
    prompt,
    tokens=1600
):
    client = get_gemini_client()

    try:
        response = generate_content_with_retry(
            client,
            model=GEMINI_MODEL,
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            config={
                "system_instruction":
                    SYSTEM_INSTRUCTION,
                "max_output_tokens":
                    tokens,
            },
        )

    except Exception as exc:

        if is_quota_error(exc):
            raise GeminiQuotaError(
                "Gemini quota or rate limit reached"
            ) from exc

        raise

    text = (
        getattr(
            response,
            "text",
            ""
        )
        or ""
    ).strip()

    if text.startswith("```"):
        text = (
            text
            .replace(
                "```json",
                "",
                1
            )
            .replace(
                "```",
                ""
            )
            .strip()
        )

    if not text:
        raise RuntimeError(
            "Gemini returned empty response"
        )

    return json.loads(text)


def normalize_analysis(result):
    if not isinstance(result, dict):
        raise ValueError(
            "Invalid AI analysis"
        )

    recommendation = _clean(
        result.get(
            "recommendation"
        ),
        "Review"
    )

    if recommendation not in (
        "Proceed",
        "Review",
        "Avoid"
    ):
        recommendation = "Review"

    risk = _clean(
        result.get("risk_level"),
        "Medium"
    )

    if risk not in (
        "Low",
        "Medium",
        "High"
    ):
        risk = "Medium"

    try:
        confidence = float(
            result.get(
                "confidence",
                0
            )
        )

        confidence = max(
            0,
            min(
                100,
                confidence
            )
        )

    except (
        TypeError,
        ValueError
    ):
        confidence = 0

    return {
        "recommendation":
            recommendation,

        "risk_level":
            risk,

        "confidence":
            confidence,

        "summary":
            _clean(
                result.get(
                    "summary"
                ),
                "No summary returned."
            ),

        "key_factors":
            _list(
                result.get(
                    "key_factors"
                )
            ),

        "pros":
            _list(
                result.get("pros")
            ),

        "cons":
            _list(
                result.get("cons")
            ),

        "missing_information":
            _list(
                result.get(
                    "missing_information"
                )
            ),

        "alternatives":
            _list(
                result.get(
                    "alternatives"
                )
            ),

        "assumptions":
            _list(
                result.get(
                    "assumptions"
                )
            ),

        "action_plan":
            _list(
                result.get(
                    "action_plan"
                )
            ),
    }


def analyze_decision(decision):

    prompt = f"""
You are DecisionLens, an AI decision-intelligence assistant.

Analyze the supplied personal decision
without inventing facts.

TITLE:
{decision.get("title")}

CONTEXT:
{decision.get("context") or decision.get("description")}

STATUS:
{decision.get("status")}

PRIORITY:
{decision.get("priority")}

CATEGORY:
{decision.get("category")}

OPTIONS:
{json.dumps(
    decision.get("options", [])
)}

CRITERIA:
{json.dumps(
    decision.get("criteria", [])
)}

Return ONLY JSON with exactly these fields:

recommendation
risk_level
confidence
summary
key_factors[]
pros[]
cons[]
missing_information[]
alternatives[]
assumptions[]
action_plan[]

recommendation must be:
Proceed, Review, or Avoid.

risk_level must be:
Low, Medium, or High.

confidence must be:
0 to 100.

Separate known facts from assumptions.
Be practical and concise.
"""

    return normalize_analysis(
        _json_response(prompt)
    )


def run_agent(
    decision,
    previous
):
    memory = []

    for item in previous[-10:]:

        if (
            item.get("id")
            == decision.get("id")
        ):
            continue

        memory.append({
            key: item.get(key)
            for key in (
                "title",
                "context",
                "status",
                "priority",
                "category",
                "ai_analysis",
            )
        })

    prompt = f"""
You are DecisionLens Decision
Intelligence Agent.

Use previous decisions only as
contextual patterns.

Never treat previous decisions
as facts.

CURRENT DECISION:

{json.dumps(
    decision,
    default=str,
    indent=2
)}

PREVIOUS DECISIONS:

{json.dumps(
    memory,
    default=str,
    indent=2
)}

Return ONLY JSON with exactly:

recommendation
risk_level
confidence
summary
key_factors[]
missing_information[]
alternatives[]
assumptions[]
action_plan[]

Do not invent facts.
Identify uncertainty.
Do not blindly recommend Proceed.
"""

    return normalize_analysis(
        _json_response(
            prompt,
            1800
        )
    )


def compare_decisions(
    first,
    second
):

    prompt = f"""
Compare these two personal
decisions using only supplied
information.

DECISION A:

{json.dumps(
    first,
    default=str,
    indent=2
)}

DECISION B:

{json.dumps(
    second,
    default=str,
    indent=2
)}

Return ONLY JSON:

{{
  "winner":
    "Decision A | Decision B | Too Close To Call",

  "confidence": 0,

  "summary": "",

  "advantages_a": [],

  "advantages_b": [],

  "risks_a": [],

  "risks_b": [],

  "recommendation": ""
}}
"""

    result = _json_response(
        prompt,
        1400
    )

    try:
        result["confidence"] = max(
            0,
            min(
                100,
                float(
                    result.get(
                        "confidence",
                        0
                    )
                )
            )
        )
    except (
        TypeError,
        ValueError
    ):
        result["confidence"] = 0

    return result


def save_analysis(
    uid,
    decision_id,
    analysis,
    kind="ai_analysis"
):
    ref = decision_ref(
        uid,
        decision_id
    )

    snapshot = ref.get()

    if (
        not snapshot.exists
        or (snapshot.to_dict() or {}).get(
            "user_id"
        ) != uid
    ):
        return False

    now = datetime.now(
        timezone.utc
    )

    timestamp_field = (
        "ai_analyzed_at"
        if kind == "ai_analysis"
        else "agent_analyzed_at"
    )

    ref.update({
        kind: analysis,
        timestamp_field: now,
        "updated_at": now,
    })

    add_history(
        uid,
        decision_id,
        kind,
        analysis
    )

    return True


def record_outcome(
    uid,
    decision_id,
    outcome,
    result
):
    ref = decision_ref(
        uid,
        decision_id
    )

    snapshot = ref.get()

    if (
        not snapshot.exists
        or (snapshot.to_dict() or {}).get(
            "user_id"
        ) != uid
    ):
        return False

    now = datetime.now(
        timezone.utc
    )

    ref.update({
        "outcome": outcome,
        "outcome_result": result,
        "outcome_recorded_at": now,
        "status": "completed",
        "updated_at": now,
    })

    add_history(
        uid,
        decision_id,
        "outcome_recorded",
        {
            "outcome": outcome,
            "result": result
        }
    )

    return True


def prediction(
    uid,
    decision_id
):
    decision = get_decision(
        uid,
        decision_id
    )

    if not decision:
        return (
            None,
            "Decision not found"
        )

    analysis = (
        decision.get(
            "agent_analysis"
        )
        or decision.get(
            "ai_analysis"
        )
        or {}
    )

    recommendation = _clean(
        analysis.get(
            "recommendation"
        )
    )

    outcome = _clean(
        decision.get(
            "outcome"
        )
    )

    if not recommendation:
        return (
            None,
            "Run AI analysis before evaluating prediction"
        )

    if not outcome:
        return (
            None,
            "Record an actual outcome first"
        )

    successful = {
        "successful",
        "success",
        "completed",
        "positive",
    }

    unsuccessful = {
        "unsuccessful",
        "failed",
        "failure",
        "negative",
        "cancelled",
    }

    recommendation_lower = (
        recommendation.lower()
    )

    outcome_lower = (
        outcome.lower()
    )

    validated = None
    status = (
        "Insufficient information"
    )

    if (
        (
            recommendation_lower
            == "proceed"
            and outcome_lower
            in successful
        )
        or
        (
            recommendation_lower
            == "avoid"
            and outcome_lower
            in unsuccessful
        )
    ):
        validated = True
        status = "Prediction validated"

    elif (
        (
            recommendation_lower
            == "proceed"
            and outcome_lower
            in unsuccessful
        )
        or
        (
            recommendation_lower
            == "avoid"
            and outcome_lower
            in successful
        )
    ):
        validated = False
        status = (
            "Recommendation differed from outcome"
        )

    elif recommendation_lower == "review":
        status = (
            "Review recommendation preceded "
            "a recorded outcome"
        )

    return {
        "prediction": {
            "recommendation":
                recommendation,

            "confidence":
                analysis.get(
                    "confidence",
                    0
                ),

            "risk_level":
                analysis.get(
                    "risk_level",
                    "Not available"
                ),
        },

        "actual": {
            "outcome":
                outcome,

            "result":
                decision.get(
                    "outcome_result",
                    ""
                ),
        },

        "evaluation": {
            "status":
                status,

            "validated":
                validated,
        },
    }, None


def add_history(
    uid,
    decision_id,
    event_type,
    data=None
):
    (
        decision_ref(
            uid,
            decision_id
        )
        .collection("history")
        .document()
        .set({
            "event_type":
                event_type,

            "data":
                data or {},

            "created_at":
                datetime.now(
                    timezone.utc
                ),
        })
    )


def get_history(
    uid,
    decision_id
):
    decision = get_decision(
        uid,
        decision_id
    )

    if not decision:
        return None

    result = []

    query = (
        decision_ref(
            uid,
            decision_id
        )
        .collection("history")
        .order_by("created_at")
    )

    for snapshot in query.stream():

        item = (
            snapshot.to_dict()
            or {}
        )

        item["id"] = snapshot.id

        if hasattr(
            item.get("created_at"),
            "isoformat"
        ):
            item["created_at"] = (
                item["created_at"]
                .isoformat()
            )

        result.append(item)

    return result
