from datetime import datetime, timezone
from google.cloud import firestore
from app.config import PROJECT_ID

_db = None

def get_db():
    global _db
    if _db is None:
        _db = firestore.Client(project=PROJECT_ID) if PROJECT_ID else firestore.Client()
    return _db

def events_ref(uid):
    return (
        get_db()
        .collection("users")
        .document(uid)
        .collection("calendar_events")
    )

def create_event(uid, title, event_date, event_time=""):
    now = datetime.now(timezone.utc)

    ref = events_ref(uid).document()
    ref.set({
        "user_id": uid,
        "title": title,
        "event_date": event_date,
        "event_time": event_time,
        "created_at": now,
        "updated_at": now,
    })
    return ref

def list_events(uid):
    events = []

    for snapshot in events_ref(uid).stream():
        data = snapshot.to_dict() or {}

        if data.get("user_id") != uid:
            continue

        events.append({
            "id": snapshot.id,
            "title": data.get("title", ""),
            "event_date": data.get("event_date", ""),
            "event_time": data.get("event_time", ""),
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
        })

    events.sort(
        key=lambda x: (
            x.get("event_date", ""),
            x.get("event_time", "")
        )
    )

    return events

def get_event(uid, event_id):
    ref = events_ref(uid).document(event_id)
    snapshot = ref.get()

    if not snapshot.exists:
        return None

    data = snapshot.to_dict() or {}

    if data.get("user_id") != uid:
        return None

    return {
        "id": snapshot.id,
        "title": data.get("title", ""),
        "event_date": data.get("event_date", ""),
        "event_time": data.get("event_time", ""),
        "created_at": data.get("created_at"),
        "updated_at": data.get("updated_at"),
    }

def update_event(uid, event_id, title, event_date, event_time=""):
    ref = events_ref(uid).document(event_id)
    existing = ref.get()

    if not existing.exists:
        return False

    data = existing.to_dict() or {}

    if data.get("user_id") != uid:
        return False

    ref.update({
        "title": title,
        "event_date": event_date,
        "event_time": event_time,
        "updated_at": datetime.now(timezone.utc),
    })

    return True

def delete_event(uid, event_id):
    ref = events_ref(uid).document(event_id)
    existing = ref.get()

    if not existing.exists:
        return False

    data = existing.to_dict() or {}

    if data.get("user_id") != uid:
        return False

    ref.delete()
    return True
