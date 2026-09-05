from flask import Blueprint, jsonify, request

from app.auth import require_authenticated_user
from app.gemini_service import GeminiQuotaError
from app.summary_service import generate_summary
from app.firestore_service import (
    get_ai_result,
    save_ai_result,
)

summary_bp = Blueprint(
    "summaries",
    __name__,
    url_prefix="/api/summaries"
)


@summary_bp.get("/latest")
@require_authenticated_user
def get_latest_summary():
    result = get_ai_result(
        request.authenticated_uid,
        "summary"
    )

    return jsonify({
        "summary": result
    })


@summary_bp.post("")
@require_authenticated_user
def summary():
    try:
        result = generate_summary(
            request.authenticated_uid
        )

        saved = save_ai_result(
            request.authenticated_uid,
            "summary",
            result
        )

        return jsonify({
            "summary": saved
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
            "error": "Summary temporarily unavailable",
            "code": "gemini_unavailable"
        }), 503
