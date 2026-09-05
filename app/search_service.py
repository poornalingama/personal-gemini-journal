from app.journal_service import list_journals
from app.goals_service import list_goals
from app.calendar_service import list_events
from app.bookmark_service import list_bookmarks
from app.decisionlens_service import list_decisions

def search_all(uid, query):
    query = str(query or "").strip().lower()

    if not query:
        return []

    results = []

    for item in list_journals(uid):
        text = (
            str(item.get("title", "")) +
            " " +
            str(item.get("content", ""))
        ).lower()

        if query in text:
            results.append({
                "type": "journal",
                "id": item["id"],
                "title": item.get("title", "Journal"),
                "content": item.get("content", ""),
            })

    for item in list_goals(uid):
        if query in str(item.get("title", "")).lower():
            results.append({
                "type": "goal",
                "id": item["id"],
                "title": item.get("title", "Goal"),
                "content": "",
            })

    for item in list_events(uid):
        text = (
            str(item.get("title", "")) +
            " " +
            str(item.get("event_date", ""))
        ).lower()

        if query in text:
            results.append({
                "type": "calendar",
                "id": item["id"],
                "title": item.get("title", "Event"),
                "content": item.get("event_date", ""),
            })

    for item in list_bookmarks(uid):
        text = (
            str(item.get("title", "")) +
            " " +
            str(item.get("content", ""))
        ).lower()

        if query in text:
            results.append({
                "type": "bookmark",
                "id": item["id"],
                "title": item.get("title", "Bookmark"),
                "content": item.get("content", ""),
            })

    for item in list_decisions(uid):
        text = (
            str(item.get("title", "")) +
            " " +
            str(item.get("context", "")) +
            " " +
            str(item.get("analysis", ""))
        ).lower()

        if query in text:
            results.append({
                "type": "decision",
                "id": item["id"],
                "title": item.get("title", "Decision"),
                "content": item.get("context", ""),
            })

    return results
