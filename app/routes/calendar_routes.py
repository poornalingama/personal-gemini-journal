from flask import Blueprint, jsonify, request

from app.auth import require_authenticated_user
from app.calendar_service import (
    create_event,
    list_events,
    get_event,
    update_event,
    delete_event,
)

calendar_bp = Blueprint(
    "calendar",
    __name__,
    url_prefix="/api/calendar"
)

def uid():
    return request.authenticated_uid

@calendar_bp.get("")
@require_authenticated_user
def list_all():
    return jsonify(list_events(uid()))

@calendar_bp.post("")
@require_authenticated_user
def create():
    body = request.get_json(silent=True) or {}

    title = str(body.get("title", "")).strip()
    event_date = str(body.get("event_date", "")).strip()
    event_time = str(body.get("event_time", "")).strip()

    if not title:
        return jsonify({"error": "Event title is required"}), 400

    if not event_date:
        return jsonify({"error": "Event date is required"}), 400

    ref = create_event(
        uid(),
        title,
        event_date,
        event_time
    )

    return jsonify({
        "id": ref.id,
        "message": "Event created"
    }), 201

@calendar_bp.get("/<event_id>")
@require_authenticated_user
def get_one(event_id):
    event = get_event(uid(), event_id)

    if event is None:
        return jsonify({"error": "Event not found"}), 404

    return jsonify(event)

@calendar_bp.put("/<event_id>")
@require_authenticated_user
def update(event_id):
    body = request.get_json(silent=True) or {}

    title = str(body.get("title", "")).strip()
    event_date = str(body.get("event_date", "")).strip()
    event_time = str(body.get("event_time", "")).strip()

    if not title or not event_date:
        return jsonify({
            "error": "Event title and date are required"
        }), 400

    updated = update_event(
        uid(),
        event_id,
        title,
        event_date,
        event_time
    )

    if not updated:
        return jsonify({"error": "Event not found"}), 404

    return jsonify({"message": "Event updated"})

@calendar_bp.delete("/<event_id>")
@require_authenticated_user
def delete(event_id):
    deleted = delete_event(uid(), event_id)

    if not deleted:
        return jsonify({"error": "Event not found"}), 404

    return jsonify({"message": "Event deleted"})
