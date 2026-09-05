from flask import (
    Blueprint,
    jsonify,
    request,
    current_app,
)

from app.auth import (
    require_authenticated_user
)

from app.decisionlens_service import (
    create_decision,
    list_decisions,
    get_decision,
    update_decision,
    delete_decision,
    analyze_decision,
    run_agent,
    compare_decisions,
    save_analysis,
    record_outcome,
    update_actions,
    update_agent_confirmations,
    prediction,
    get_history,
)

from app.gemini_service import (
    GeminiQuotaError
)


decision_bp = Blueprint(
    "decisions",
    __name__,
    url_prefix="/api/decisions"
)


def uid():
    return request.authenticated_uid


def ai_error(exc):

    if isinstance(
        exc,
        GeminiQuotaError
    ):
        return jsonify({
            "error":
                "Gemini quota or rate limit reached",

            "code":
                "quota_exceeded",
        }), 429

    current_app.logger.exception(
        "DecisionLens AI error: %s",
        exc
    )

    return jsonify({
        "error":
            "AI analysis temporarily unavailable",

        "code":
            "gemini_unavailable",
    }), 503


@decision_bp.get("")
@require_authenticated_user
def list_all():
    return jsonify(
        list_decisions(uid())
    )


@decision_bp.post("")
@require_authenticated_user
def create():

    body = (
        request.get_json(
            silent=True
        )
        or {}
    )

    title = str(
        body.get(
            "title",
            ""
        )
    ).strip()

    context = str(
        body.get(
            "context",
            ""
        )
    ).strip()

    if not title:
        return jsonify({
            "error":
                "Decision title is required"
        }), 400

    if len(title) > 200:
        return jsonify({
            "error":
                "Decision title is too long"
        }), 400

    if len(context) > 50000:
        return jsonify({
            "error":
                "Decision context is too long"
        }), 400

    try:

        decision_id = create_decision(
            uid(),
            body
        )

        decision = get_decision(
            uid(),
            decision_id
        )

        analysis = analyze_decision(
            decision
        )

        save_analysis(
            uid(),
            decision_id,
            analysis
        )

        return jsonify({
            "id":
                decision_id,

            "decision":
                get_decision(
                    uid(),
                    decision_id
                ),

            "analysis":
                analysis,
        }), 201

    except Exception as exc:
        return ai_error(exc)


@decision_bp.get(
    "/<decision_id>"
)
@require_authenticated_user
def get_one(decision_id):

    decision = get_decision(
        uid(),
        decision_id
    )

    if not decision:
        return jsonify({
            "error":
                "Decision not found"
        }), 404

    return jsonify(decision)


@decision_bp.put(
    "/<decision_id>"
)
@require_authenticated_user
def update(decision_id):

    body = (
        request.get_json(
            silent=True
        )
        or {}
    )

    if not update_decision(
        uid(),
        decision_id,
        body
    ):
        return jsonify({
            "error":
                "Decision not found"
        }), 404

    return jsonify(
        get_decision(
            uid(),
            decision_id
        )
    )



@decision_bp.put(
    "/<decision_id>/actions"
)
@require_authenticated_user
def update_actions_route(decision_id):

    body = (
        request.get_json(
            silent=True
        )
        or {}
    )

    actions = body.get("actions", [])

    if not isinstance(actions, list):
        return jsonify({
            "error": "Actions must be a list"
        }), 400

    result = update_actions(
        uid(),
        decision_id,
        actions
    )

    if result is None:
        return jsonify({
            "error": "Decision not found"
        }), 404

    return jsonify({
        "actions": result
    })


@decision_bp.delete(
    "/<decision_id>"
)
@require_authenticated_user
def delete(decision_id):

    if not delete_decision(
        uid(),
        decision_id
    ):
        return jsonify({
            "error":
                "Decision not found"
        }), 404

    return jsonify({
        "message":
            "Decision deleted"
    })


@decision_bp.post(
    "/<decision_id>/analyze"
)
@require_authenticated_user
def analyze(decision_id):

    decision = get_decision(
        uid(),
        decision_id
    )

    if not decision:
        return jsonify({
            "error":
                "Decision not found"
        }), 404

    try:

        result = analyze_decision(
            decision
        )

        save_analysis(
            uid(),
            decision_id,
            result
        )

        return jsonify({
            "analysis":
                result,

            "cached":
                False,
        })

    except Exception as exc:
        return ai_error(exc)


@decision_bp.put(
    "/<decision_id>/agent-confirmations"
)
@require_authenticated_user
def update_agent_confirmations_route(
    decision_id
):

    body = (
        request.get_json(
            silent=True
        )
        or {}
    )

    confirmations = body.get(
        "confirmations",
        []
    )

    if not isinstance(confirmations, list):
        return jsonify({
            "error":
                "Confirmations must be a list"
        }), 400

    result = update_agent_confirmations(
        uid(),
        decision_id,
        confirmations
    )

    if result is None:
        return jsonify({
            "error":
                "Decision not found"
        }), 404

    return jsonify({
        "confirmations":
            result
    })



@decision_bp.post(
    "/<decision_id>/agent"
)
@require_authenticated_user
def agent(decision_id):

    decision = get_decision(
        uid(),
        decision_id
    )

    if not decision:
        return jsonify({
            "error":
                "Decision not found"
        }), 404

    try:

        result = run_agent(
            decision,
            list_decisions(uid())
        )

        save_analysis(
            uid(),
            decision_id,
            result,
            "agent_analysis"
        )

        return jsonify({
            "analysis":
                result
        })

    except Exception as exc:
        return ai_error(exc)


@decision_bp.post("/compare")
@require_authenticated_user
def compare():

    body = (
        request.get_json(
            silent=True
        )
        or {}
    )

    first_id = body.get(
        "first_id"
    )

    second_id = body.get(
        "second_id"
    )

    if not first_id or not second_id:
        return jsonify({
            "error":
                "Two decision IDs are required"
        }), 400

    if first_id == second_id:
        return jsonify({
            "error":
                "Choose two different decisions"
        }), 400

    first = get_decision(
        uid(),
        first_id
    )

    second = get_decision(
        uid(),
        second_id
    )

    if not first or not second:
        return jsonify({
            "error":
                "One or both decisions were not found"
        }), 404

    try:

        result = compare_decisions(
            first,
            second
        )

        return jsonify({
            "comparison":
                result
        })

    except Exception as exc:
        return ai_error(exc)


@decision_bp.post(
    "/<decision_id>/outcome"
)
@require_authenticated_user
def outcome(decision_id):

    body = (
        request.get_json(
            silent=True
        )
        or {}
    )

    outcome_value = str(
        body.get(
            "outcome",
            ""
        )
    ).strip()

    result = str(
        body.get(
            "result",
            ""
        )
    ).strip()

    if not outcome_value:
        return jsonify({
            "error":
                "Outcome is required"
        }), 400

    if not record_outcome(
        uid(),
        decision_id,
        outcome_value,
        result
    ):
        return jsonify({
            "error":
                "Decision not found"
        }), 404

    saved = get_decision(
        uid(),
        decision_id
    )

    return jsonify({
        "message":
            "Outcome recorded",
        "decision":
            saved
    })


@decision_bp.get(
    "/<decision_id>/prediction"
)
@require_authenticated_user
def decision_prediction(
    decision_id
):

    result, error = prediction(
        uid(),
        decision_id
    )

    if error:
        status = (
            404
            if error == "Decision not found"
            else 400
        )

        return jsonify({
            "error":
                error
        }), status

    return jsonify(result)


@decision_bp.get(
    "/<decision_id>/history"
)
@require_authenticated_user
def history(decision_id):

    result = get_history(
        uid(),
        decision_id
    )

    if result is None:
        return jsonify({
            "error":
                "Decision not found"
        }), 404

    return jsonify({
        "history":
            result
    })
