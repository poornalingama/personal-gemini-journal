from flask import Blueprint, jsonify, request

from app.auth import require_authenticated_user
from app.goals_service import (
    create_goal,
    list_goals,
    update_goal,
    delete_goal,
)

goal_bp = Blueprint(
    "goals",
    __name__,
    url_prefix="/api/goals"
)

def uid():
    return request.authenticated_uid

@goal_bp.get("")
@require_authenticated_user
def list_all():
    return jsonify(list_goals(uid()))

@goal_bp.post("")
@require_authenticated_user
def create():
    body = request.get_json(silent=True) or {}
    title = str(body.get("title", "")).strip()

    if not title:
        return jsonify({"error": "Goal title is required"}), 400

    ref = create_goal(uid(), title)

    return jsonify({
        "id": ref.id,
        "message": "Goal created"
    }), 201

@goal_bp.put("/<goal_id>")
@require_authenticated_user
def update(goal_id):
    body = request.get_json(silent=True) or {}

    title = body.get("title")
    completed = body.get("completed")
    progress = body.get("progress")

    if title is not None:
        title = str(title).strip()

        if not title:
            return jsonify({"error": "Goal title is required"}), 400

    try:
        if progress is not None:
            progress = int(progress)
    except (TypeError, ValueError):
        return jsonify({"error": "Progress must be a number"}), 400

    updated = update_goal(
        uid(),
        goal_id,
        title,
        completed,
        progress
    )

    if not updated:
        return jsonify({"error": "Goal not found"}), 404

    return jsonify({"message": "Goal updated"})

@goal_bp.delete("/<goal_id>")
@require_authenticated_user
def delete(goal_id):
    deleted = delete_goal(uid(), goal_id)

    if not deleted:
        return jsonify({"error": "Goal not found"}), 404

    return jsonify({"message": "Goal deleted"})
