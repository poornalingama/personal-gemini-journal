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


def conversation_reference(uid, conversation_id):
    """
    Return the Firestore reference for a user's conversation.

    User isolation is enforced structurally by nesting the conversation
    below the authenticated user's UID.
    """

    if not uid:
        raise ValueError("UID is required")

    if not conversation_id:
        raise ValueError("Conversation ID is required")

    return (
        get_db()
        .collection("users")
        .document(uid)
        .collection("conversations")
        .document(conversation_id)
    )


def create_conversation(uid, conversation_id, title="New conversation"):
    ref = conversation_reference(
        uid,
        conversation_id
    )

    now = datetime.now(timezone.utc)

    ref.set({
        "user_id": uid,
        "title": title,
        "created_at": now,
        "updated_at": now,
        "messages": [],
    })

    return ref


def get_conversation(uid, conversation_id):
    ref = conversation_reference(
        uid,
        conversation_id
    )

    snapshot = ref.get()

    if not snapshot.exists:
        return None

    data = snapshot.to_dict() or {}

    # Defense in depth: verify the stored owner.
    if data.get("user_id") != uid:
        return None

    return data


def save_conversation(
    uid,
    conversation_id,
    messages,
    title=None
):
    ref = conversation_reference(
        uid,
        conversation_id
    )

    existing = ref.get()

    if existing.exists:
        existing_data = existing.to_dict() or {}

        if existing_data.get("user_id") != uid:
            raise PermissionError(
                "Conversation does not belong to this user"
            )

    now = datetime.now(timezone.utc)

    payload = {
        "user_id": uid,
        "messages": messages,
        "updated_at": now,
    }

    if not existing.exists:
        payload["created_at"] = now

    if title:
        payload["title"] = title
    elif not existing.exists:
        payload["title"] = "New conversation"

    ref.set(
        payload,
        merge=True
    )

    return ref


def list_conversations(uid):
    query = (
        get_db()
        .collection("users")
        .document(uid)
        .collection("conversations")
        .order_by(
            "updated_at",
            direction=firestore.Query.DESCENDING
        )
    )

    conversations = []

    for snapshot in query.stream():
        data = snapshot.to_dict() or {}

        if data.get("user_id") != uid:
            continue

        updated_at = data.get("updated_at")

        if updated_at is not None:
            try:
                updated_at = updated_at.isoformat()
            except AttributeError:
                updated_at = str(updated_at)

        conversations.append({
            "id": snapshot.id,
            "title": data.get(
                "title",
                "New conversation"
            ),
            "updated_at": updated_at,
        })

    return conversations

# ============================================================
# SAVED AI RESULTS
# ============================================================

def ai_result_reference(uid, result_type):
    if not uid:
        raise ValueError("UID is required")

    if result_type not in ("insights", "summary"):
        raise ValueError("Unsupported AI result type")

    return (
        get_db()
        .collection("users")
        .document(uid)
        .collection("ai_results")
        .document(result_type)
    )


def save_ai_result(uid, result_type, content):
    ref = ai_result_reference(uid, result_type)

    now = datetime.now(timezone.utc)

    ref.set({
        "user_id": uid,
        "type": result_type,
        "content": content,
        "generated_at": now,
        "updated_at": now,
    }, merge=True)

    return {
        "content": content,
        "generated_at": now.isoformat(),
    }


def get_ai_result(uid, result_type):
    ref = ai_result_reference(uid, result_type)

    snapshot = ref.get()

    if not snapshot.exists:
        return None

    data = snapshot.to_dict() or {}

    if data.get("user_id") != uid:
        return None

    generated_at = data.get("generated_at")

    if generated_at is not None:
        try:
            generated_at = generated_at.isoformat()
        except AttributeError:
            generated_at = str(generated_at)

    return {
        "content": data.get("content", ""),
        "generated_at": generated_at,
    }
