from datetime import datetime, timezone

from google.cloud import firestore

from app.config import PROJECT_ID

_db = None

def get_db():
    global _db

    if _db is None:
        _db = firestore.Client(
            project=PROJECT_ID
        ) if PROJECT_ID else firestore.Client()

    return _db

def bookmarks_ref(uid):
    return (
        get_db()
        .collection("users")
        .document(uid)
        .collection("bookmarks")
    )

def create_bookmark(uid, title, content):
    now = datetime.now(timezone.utc)
    ref = bookmarks_ref(uid).document()

    ref.set({
        "user_id": uid,
        "title": title,
        "content": content,
        "created_at": now,
        "updated_at": now,
    })

    return ref

def list_bookmarks(uid):
    result = []

    for snapshot in bookmarks_ref(uid).stream():
        data = snapshot.to_dict() or {}

        if data.get("user_id") != uid:
            continue

        result.append({
            "id": snapshot.id,
            "title": data.get("title", ""),
            "content": data.get("content", ""),
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
        })

    return result

def update_bookmark(uid, bookmark_id, title, content):
    ref = bookmarks_ref(uid).document(bookmark_id)
    existing = ref.get()

    if not existing.exists:
        return False

    data = existing.to_dict() or {}

    if data.get("user_id") != uid:
        return False

    ref.update({
        "title": title,
        "content": content,
        "updated_at": datetime.now(timezone.utc),
    })

    return True

def delete_bookmark(uid, bookmark_id):
    ref = bookmarks_ref(uid).document(bookmark_id)
    existing = ref.get()

    if not existing.exists:
        return False

    data = existing.to_dict() or {}

    if data.get("user_id") != uid:
        return False

    ref.delete()
    return True
