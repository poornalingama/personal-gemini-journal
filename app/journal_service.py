from datetime import datetime, timezone

from google.cloud import firestore

from app.config import PROJECT_ID


_db = None


def get_db():
    global _db

    if _db is None:
        if PROJECT_ID:
            _db = firestore.Client(
                project=PROJECT_ID
            )
        else:
            _db = firestore.Client()

    return _db


def journal_reference(uid, journal_id):
    if not uid:
        raise ValueError("UID is required")

    if not journal_id:
        raise ValueError("Journal ID is required")

    return (
        get_db()
        .collection("users")
        .document(uid)
        .collection("journals")
        .document(journal_id)
    )


def create_journal(uid, title, content):
    now = datetime.now(timezone.utc)

    ref = (
        get_db()
        .collection("users")
        .document(uid)
        .collection("journals")
        .document()
    )

    ref.set({
        "user_id": uid,
        "title": title or "Untitled Journal",
        "content": content,
        "created_at": now,
        "updated_at": now,
    })

    return ref


def get_journal(uid, journal_id):
    ref = journal_reference(
        uid,
        journal_id
    )

    snapshot = ref.get()

    if not snapshot.exists:
        return None

    data = snapshot.to_dict() or {}

    if data.get("user_id") != uid:
        return None

    return {
        "id": snapshot.id,
        "title": data.get(
            "title",
            "Untitled Journal"
        ),
        "content": data.get(
            "content",
            ""
        ),
        "created_at": data.get(
            "created_at"
        ),
        "updated_at": data.get(
            "updated_at"
        ),
        "ai_analysis": data.get(
            "ai_analysis"
        ),
        "ai_analyzed_at": data.get(
            "ai_analyzed_at"
        ),
        "ai_analysis_version": data.get(
            "ai_analysis_version"
        ),
    }


def list_journals(uid):
    query = (
        get_db()
        .collection("users")
        .document(uid)
        .collection("journals")
        .order_by(
            "updated_at",
            direction=firestore.Query.DESCENDING
        )
    )

    journals = []

    for snapshot in query.stream():
        data = snapshot.to_dict() or {}

        if data.get("user_id") != uid:
            continue

        journals.append({
            "id": snapshot.id,
            "title": data.get(
                "title",
                "Untitled Journal"
            ),
            "content": data.get(
                "content",
                ""
            ),
            "created_at": data.get(
                "created_at"
            ),
            "updated_at": data.get(
                "updated_at"
            ),
            "ai_analysis": data.get(
                "ai_analysis"
            ),
            "ai_analyzed_at": data.get(
                "ai_analyzed_at"
            ),
            "ai_analysis_version": data.get(
                "ai_analysis_version"
            ),
        })

    return journals


def update_journal(
    uid,
    journal_id,
    title,
    content
):
    ref = journal_reference(
        uid,
        journal_id
    )

    existing = ref.get()

    if not existing.exists:
        return False

    data = existing.to_dict() or {}

    if data.get("user_id") != uid:
        return False

    ref.update({
        "title": title or "Untitled Journal",
        "content": content,
        "updated_at": datetime.now(
            timezone.utc
        ),
        "ai_analysis": firestore.DELETE_FIELD,
        "ai_analyzed_at": firestore.DELETE_FIELD,
        "ai_analysis_version": firestore.DELETE_FIELD,
    })

    return True


def delete_journal(uid, journal_id):
    ref = journal_reference(
        uid,
        journal_id
    )

    existing = ref.get()

    if not existing.exists:
        return False

    data = existing.to_dict() or {}

    if data.get("user_id") != uid:
        return False

    ref.delete()

    return True


def save_journal_analysis(
    uid,
    journal_id,
    analysis
):
    """
    Save the latest Gemini analysis for a journal.

    The original journal title/content are never modified.
    """

    ref = journal_reference(
        uid,
        journal_id
    )

    existing = ref.get()

    if not existing.exists:
        return False

    data = existing.to_dict() or {}

    if data.get("user_id") != uid:
        return False

    ref.update({
        "ai_analysis": str(
            analysis or ""
        ).strip(),

        "ai_analyzed_at": datetime.now(
            timezone.utc
        ),

        "ai_analysis_version": 1,
    })

    return True
