from datetime import datetime, timezone
from google.cloud import firestore
from app.config import PROJECT_ID

_db = None

def get_db():
    global _db
    if _db is None:
        _db = firestore.Client(project=PROJECT_ID) if PROJECT_ID else firestore.Client()
    return _db

def goals_ref(uid):
    return (
        get_db()
        .collection("users")
        .document(uid)
        .collection("goals")
    )

def create_goal(uid, title):
    now = datetime.now(timezone.utc)
    ref = goals_ref(uid).document()

    ref.set({
        "user_id": uid,
        "title": title,
        "completed": False,
        "progress": 0,
        "created_at": now,
        "updated_at": now,
    })

    return ref

def list_goals(uid):
    result = []

    for snapshot in goals_ref(uid).stream():
        data = snapshot.to_dict() or {}

        if data.get("user_id") != uid:
            continue

        result.append({
            "id": snapshot.id,
            "title": data.get("title", ""),
            "completed": bool(data.get("completed", False)),
            "progress": int(data.get("progress", 0)),
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
        })

    result.sort(
        key=lambda x: str(x.get("updated_at", "")),
        reverse=True
    )

    return result

def update_goal(uid, goal_id, title=None, completed=None, progress=None):
    ref = goals_ref(uid).document(goal_id)
    existing = ref.get()

    if not existing.exists:
        return False

    data = existing.to_dict() or {}

    if data.get("user_id") != uid:
        return False

    updates = {
        "updated_at": datetime.now(timezone.utc)
    }

    if title is not None:
        updates["title"] = title

    if completed is not None:
        updates["completed"] = bool(completed)

    if progress is not None:
        progress = max(0, min(100, int(progress)))
        updates["progress"] = progress

        if progress >= 100:
            updates["completed"] = True

    ref.update(updates)
    return True

def delete_goal(uid, goal_id):
    ref = goals_ref(uid).document(goal_id)
    existing = ref.get()

    if not existing.exists:
        return False

    data = existing.to_dict() or {}

    if data.get("user_id") != uid:
        return False

    ref.delete()
    return True
