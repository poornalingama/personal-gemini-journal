import uuid

from flask import Blueprint, jsonify, request

from app.auth import require_authenticated_user
from app.firestore_service import (
    create_conversation,
    get_conversation,
    list_conversations,
    save_conversation,
)
from app.gemini_service import (
    GeminiQuotaError,
    generate_response
)


chat_bp = Blueprint(
    "chat",
    __name__,
    url_prefix="/api/chat"
)


def get_uid():
    """
    UID is obtained exclusively from the verified Firebase ID token.
    """

    return request.authenticated_uid


@chat_bp.post("/message")
@require_authenticated_user
def send_message():

    body = request.get_json(
        silent=True
    ) or {}

    message = body.get("message")
    conversation_id = body.get(
        "conversation_id"
    )

    if not isinstance(message, str):
        return jsonify({
            "error": "message must be a string"
        }), 400

    message = message.strip()

    if not message:
        return jsonify({
            "error": "message cannot be empty"
        }), 400

    if len(message) > 10000:
        return jsonify({
            "error": "message is too long"
        }), 400

    uid = get_uid()

    if not conversation_id:
        conversation_id = uuid.uuid4().hex

        create_conversation(
            uid,
            conversation_id
        )

    conversation = get_conversation(
        uid,
        conversation_id
    )

    if conversation is None:
        return jsonify({
            "error": "Conversation not found"
        }), 404

    messages = conversation.get(
        "messages",
        []
    )

    if not isinstance(messages, list):
        messages = []

    history = []

    for item in messages:
        if not isinstance(item, dict):
            continue

        role = item.get("role")
        content = item.get("content")

        if role in ("user", "assistant") and isinstance(
            content,
            str
        ):
            history.append({
                "role": role,
                "content": content
            })

    try:
        assistant_message = generate_response(
            history,
            message
        )

    except GeminiQuotaError:
        return jsonify({
            "error": "Gemini free-tier limit reached",
            "code": "quota_exceeded",
            "message": (
                "The Gemini free-tier request limit has "
                "been reached. Your conversation is safe. "
                "Please try again after the limit resets."
            )
        }), 429

    except Exception:
        return jsonify({
            "error": "Gemini service temporarily unavailable",
            "code": "gemini_unavailable"
        }), 503

    history.append({
        "role": "user",
        "content": message
    })

    history.append({
        "role": "assistant",
        "content": assistant_message
    })

    title = None

    if len(history) == 2:
        title = message[:80]

    save_conversation(
        uid,
        conversation_id,
        history,
        title=title
    )

    return jsonify({
        "conversation_id": conversation_id,
        "message": assistant_message
    })


@chat_bp.get("/conversations")
@require_authenticated_user
def conversations():

    uid = get_uid()

    try:
        data = list_conversations(uid)

        return jsonify({
            "conversations": data
        })

    except Exception:
        return jsonify({
            "error": "Unable to load conversations"
        }), 500


@chat_bp.get("/conversations/<conversation_id>")
@require_authenticated_user
def conversation(conversation_id):

    uid = get_uid()

    data = get_conversation(
        uid,
        conversation_id
    )

    if data is None:
        return jsonify({
            "error": "Conversation not found"
        }), 404

    return jsonify({
        "conversation_id": conversation_id,
        "title": data.get(
            "title",
            "New conversation"
        ),
        "messages": data.get(
            "messages",
            []
        ),
    })
