from flask import Blueprint, jsonify, request

from app.auth import require_authenticated_user
from app.gemini_service import GeminiQuotaError
from app.insight_service import generate_insights
from app.firestore_service import (
    get_ai_result,
    save_ai_result,
)

insight_bp = Blueprint(
    "insights",
    __name__,
    url_prefix="/api/insights"
)


@insight_bp.get("")
@require_authenticated_user
def get_saved_insights():
    result = get_ai_result(
        request.authenticated_uid,
        "insights"
    )

    return jsonify({
        "insights": result
    })


@insight_bp.post("")
@require_authenticated_user
def insights():
    try:
        result = generate_insights(
            request.authenticated_uid
        )

        saved = save_ai_result(
            request.authenticated_uid,
            "insights",
            result
        )

        return jsonify({
            "insights": saved
        })

    except GeminiQuotaError:
        return jsonify({
            "error": "Gemini free-tier limit reached",
            "code": "quota_exceeded"
        }), 429

    except ValueError as exc:
        return jsonify({
            "error": str(exc)
        }), 400

    except Exception:
        return jsonify({
            "error": "Gemini insights temporarily unavailable",
            "code": "gemini_unavailable"
        }), 503
