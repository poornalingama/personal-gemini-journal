from flask import Blueprint, jsonify, request

from app.auth import require_authenticated_user
from app.analytics_service import get_analytics

analytics_bp = Blueprint(
    "analytics",
    __name__,
    url_prefix="/api/analytics"
)

@analytics_bp.get("")
@require_authenticated_user
def analytics():
    return jsonify(
        get_analytics(request.authenticated_uid)
    )
