from flask import Blueprint, jsonify, request

from app.auth import require_authenticated_user
from app.search_service import search_all

search_bp = Blueprint(
    "search",
    __name__,
    url_prefix="/api/search"
)

@search_bp.get("")
@require_authenticated_user
def search():
    query = request.args.get("q", "")

    return jsonify(
        search_all(
            request.authenticated_uid,
            query
        )
    )
