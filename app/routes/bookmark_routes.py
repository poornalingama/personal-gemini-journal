from flask import Blueprint, jsonify, request

from app.auth import require_authenticated_user
from app.bookmark_service import (
    create_bookmark,
    list_bookmarks,
    update_bookmark,
    delete_bookmark,
)

bookmark_bp = Blueprint(
    "bookmarks",
    __name__,
    url_prefix="/api/bookmarks"
)

def uid():
    return request.authenticated_uid

@bookmark_bp.get("")
@require_authenticated_user
def list_all():
    return jsonify(list_bookmarks(uid()))

@bookmark_bp.post("")
@require_authenticated_user
def create():
    body = request.get_json(silent=True) or {}

    title = str(body.get("title", "")).strip()
    content = str(body.get("content", "")).strip()

    if not title and not content:
        return jsonify({
            "error": "Bookmark content is required"
        }), 400

    ref = create_bookmark(
        uid(),
        title or "Untitled Bookmark",
        content
    )

    return jsonify({
        "id": ref.id,
        "message": "Bookmark created"
    }), 201

@bookmark_bp.put("/<bookmark_id>")
@require_authenticated_user
def update(bookmark_id):
    body = request.get_json(silent=True) or {}

    title = str(body.get("title", "")).strip()
    content = str(body.get("content", "")).strip()

    if not title and not content:
        return jsonify({
            "error": "Bookmark content is required"
        }), 400

    if not update_bookmark(
        uid(),
        bookmark_id,
        title,
        content
    ):
        return jsonify({
            "error": "Bookmark not found"
        }), 404

    return jsonify({
        "message": "Bookmark updated"
    })

@bookmark_bp.delete("/<bookmark_id>")
@require_authenticated_user
def delete(bookmark_id):
    if not delete_bookmark(
        uid(),
        bookmark_id
    ):
        return jsonify({
            "error": "Bookmark not found"
        }), 404

    return jsonify({
        "message": "Bookmark deleted"
    })
