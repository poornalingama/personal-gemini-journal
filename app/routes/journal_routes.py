from flask import Blueprint, jsonify, request, current_app

from app.auth import require_authenticated_user
from app.gemini_service import (
    GeminiQuotaError,
    analyze_journal
)

from app.journal_service import (
    create_journal,
    delete_journal,
    get_journal,
    list_journals,
    save_journal_analysis,
    update_journal,
)


journal_bp = Blueprint(
    "journals",
    __name__,
    url_prefix="/api/journals"
)


def get_uid():
    return request.authenticated_uid


@journal_bp.post("")
@require_authenticated_user
def create():
    body = request.get_json(
        silent=True
    ) or {}

    title = body.get(
        "title",
        ""
    )

    content = body.get(
        "content",
        ""
    )

    if not isinstance(title, str):
        return jsonify({
            "error": "title must be a string"
        }), 400

    if not isinstance(content, str):
        return jsonify({
            "error": "content must be a string"
        }), 400

    title = title.strip()
    content = content.strip()

    if not content:
        return jsonify({
            "error": "Journal content cannot be empty"
        }), 400

    if len(title) > 200:
        return jsonify({
            "error": "Journal title is too long"
        }), 400

    if len(content) > 50000:
        return jsonify({
            "error": "Journal content is too long"
        }), 400

    ref = create_journal(
        get_uid(),
        title,
        content
    )

    return jsonify({
        "id": ref.id,
        "message": "Journal created"
    }), 201


@journal_bp.get("")
@require_authenticated_user
def list_all():
    journals = list_journals(
        get_uid()
    )

    return jsonify(journals)


@journal_bp.get("/<journal_id>")
@require_authenticated_user
def get_one(journal_id):
    journal = get_journal(
        get_uid(),
        journal_id
    )

    if journal is None:
        return jsonify({
            "error": "Journal not found"
        }), 404

    return jsonify(journal)


@journal_bp.put("/<journal_id>")
@require_authenticated_user
def update(journal_id):
    body = request.get_json(
        silent=True
    ) or {}

    title = body.get(
        "title",
        ""
    )

    content = body.get(
        "content",
        ""
    )

    if not isinstance(title, str):
        return jsonify({
            "error": "title must be a string"
        }), 400

    if not isinstance(content, str):
        return jsonify({
            "error": "content must be a string"
        }), 400

    title = title.strip()
    content = content.strip()

    if not content:
        return jsonify({
            "error": "Journal content cannot be empty"
        }), 400

    updated = update_journal(
        get_uid(),
        journal_id,
        title,
        content
    )

    if not updated:
        return jsonify({
            "error": "Journal not found"
        }), 404

    return jsonify({
        "message": "Journal updated"
    })


@journal_bp.post("/<journal_id>/analyze")
@require_authenticated_user
def analyze(journal_id):

    journal = get_journal(
        get_uid(),
        journal_id
    )

    if journal is None:
        return jsonify({
            "error": "Journal not found"
        }), 404

    # Return the previously generated analysis when the
    # journal has not changed. The update_journal() service
    # removes these fields whenever title/content changes.
    cached_analysis = journal.get("ai_analysis")

    if cached_analysis:
        return jsonify({
            "journal_id": journal_id,
            "analysis": cached_analysis,
            "saved": True,
            "cached": True
        })

    try:

        analysis = analyze_journal(
            journal.get("title"),
            journal.get("content")
        )

        saved = save_journal_analysis(
            get_uid(),
            journal_id,
            analysis
        )

        if not saved:
            return jsonify({
                "error": "Journal not found"
            }), 404

    except GeminiQuotaError:

        return jsonify({
            "error": "Gemini free-tier limit reached",
            "code": "quota_exceeded",
            "message": (
                "The Gemini free-tier request limit has "
                "been reached. Your journal is safe. "
                "Please try again after the limit resets."
            )
        }), 429

    except Exception as exc:

        current_app.logger.exception(
            "Journal Gemini analysis failed: %s",
            exc
        )

        return jsonify({
            "error": "Gemini analysis temporarily unavailable",
            "code": "gemini_unavailable"
        }), 503

    return jsonify({
        "journal_id": journal_id,
        "analysis": analysis,
        "saved": True
    })


@journal_bp.delete("/<journal_id>")
@require_authenticated_user
def delete(journal_id):
    deleted = delete_journal(
        get_uid(),
        journal_id
    )

    if not deleted:
        return jsonify({
            "error": "Journal not found"
        }), 404

    return jsonify({
        "message": "Journal deleted"
    })
