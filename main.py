import os
import json
from datetime import datetime, timezone
from app.routes.chat_routes import chat_bp
from app.routes.journal_routes import journal_bp
from app.routes.calendar_routes import calendar_bp
from app.routes.goal_routes import goal_bp
from app.routes.analytics_routes import analytics_bp
from app.routes.insight_routes import insight_bp
from app.routes.decision_routes import decision_bp
from app.routes.bookmark_routes import bookmark_bp
from app.routes.search_routes import search_bp
from app.routes.summary_routes import summary_bp
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from flask import Flask, jsonify, render_template, request
from app.auth import verify_request_token
from flask_cors import CORS
from google.cloud import firestore, secretmanager
from google import genai


PROJECT_ID = (
    os.getenv("GOOGLE_CLOUD_PROJECT")
    or os.getenv("GCP_PROJECT")
    or os.getenv("FIREBASE_PROJECT_ID")
)

SECRET_NAME = os.getenv("GEMINI_SECRET_NAME", "gemini-api-key")

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

CORS(app)

_db = None
_gemini_client = None


def initialize_firebase():
    global _db

    if not firebase_admin._apps:
        firebase_admin.initialize_app(
            options={"projectId": PROJECT_ID}
        )

    if _db is None:
        _db = firestore.Client(project=PROJECT_ID)

    return _db


def get_db():
    return initialize_firebase()


def get_gemini_key():
    client = secretmanager.SecretManagerServiceClient()

    name = (
        f"projects/{PROJECT_ID}"
        f"/secrets/{SECRET_NAME}/versions/latest"
    )

    response = client.access_secret_version(
        request={"name": name}
    )

    return response.payload.data.decode("utf-8")


def get_gemini_client():
    global _gemini_client

    if _gemini_client is None:
        api_key = get_gemini_key()

        _gemini_client = genai.Client(
            api_key=api_key
        )

    return _gemini_client


def get_token():
    header = request.headers.get("Authorization", "")

    if not header.startswith("Bearer "):
        return None

    return header[7:].strip()


def current_user():
    token = get_token()

    if not token:
        return None

    try:
        return firebase_auth.verify_id_token(
            token,
            check_revoked=True
        )
    except Exception:
        return None


def require_user():
    user = current_user()

    if not user:
        return None, (
            jsonify({
                "error": "Authentication required"
            }),
            401
        )

    return user, None


def now():
    return datetime.now(timezone.utc)


def clean(data):
    result = {}

    for key, value in (data or {}).items():

        if isinstance(value, datetime):
            result[key] = value.isoformat()

        else:
            result[key] = value

    return result


def user_collection(user_id, collection):
    return (
        get_db()
        .collection("users")
        .document(user_id)
        .collection(collection)
    )

app.register_blueprint(chat_bp)
app.register_blueprint(journal_bp)
app.register_blueprint(calendar_bp)
app.register_blueprint(goal_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(insight_bp)
app.register_blueprint(decision_bp)
app.register_blueprint(bookmark_bp)
app.register_blueprint(search_bp)
app.register_blueprint(summary_bp)


# ============================================================
# PAGE ROUTES
# ============================================================

@app.get("/")
def login_page():
    return render_template("login.html")


@app.get("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")


@app.get("/chat")
def chat_page():
    return render_template("chat.html")


@app.get("/journals")
def journals_page():
    return render_template("dashboard.html")


@app.get("/calendar")
def calendar_page():
    return render_template("dashboard.html")


@app.get("/goals")
def goals_page():
    return render_template("dashboard.html")


@app.get("/analytics")
def analytics_page():
    return render_template("dashboard.html")


@app.get("/insights")
def insights_page():
    return render_template("dashboard.html")


@app.get("/decisionlens")
def decisionlens_page():
    return render_template("dashboard.html")


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "personal-gemini-journal",
        "project": PROJECT_ID
    })


# ============================================================
# AUTHENTICATION
# ============================================================

@app.get("/api/auth/me")
def auth_me():

    user, error, status = verify_request_token()

    if error:
        return jsonify(error), status

    return jsonify({
        "authenticated": True,
        "uid": user.get("uid"),
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "email_verified": user.get(
            "email_verified",
            False
        )
    })


# ============================================================
# JOURNALS
# ============================================================

@app.get("/api/journals")
def list_journals():

    user, error = require_user()

    if error:
        return error

    docs = (
        user_collection(
            user["uid"],
            "journals"
        )
        .order_by(
            "created_at",
            direction=firestore.Query.DESCENDING
        )
        .stream()
    )

    return jsonify([
        clean({
            "id": doc.id,
            **doc.to_dict()
        })
        for doc in docs
    ])


@app.post("/api/journals")
def create_journal():

    user, error = require_user()

    if error:
        return error

    body = request.get_json(silent=True) or {}

    title = str(
        body.get("title", "")
    ).strip()

    content = str(
        body.get("content", "")
    ).strip()

    if not content:
        return jsonify({
            "error": "Journal content is required"
        }), 400

    ref = user_collection(
        user["uid"],
        "journals"
    ).document()

    data = {
        "user_id": user["uid"],
        "title": title or "Untitled Journal",
        "content": content,
        "created_at": now(),
        "updated_at": now()
    }

    ref.set(data)

    return jsonify({
        "id": ref.id,
        **clean(data)
    }), 201


@app.delete("/api/journals/<journal_id>")
def delete_journal(journal_id):

    user, error = require_user()

    if error:
        return error

    ref = user_collection(
        user["uid"],
        "journals"
    ).document(journal_id)

    if not ref.get().exists:
        return jsonify({
            "error": "Journal not found"
        }), 404

    ref.delete()

    return jsonify({
        "message": "Journal deleted"
    })


# ============================================================
# GEMINI MULTI-TURN CHAT
# ============================================================

@app.post("/api/chat")
def chat():

    user, error = require_user()

    if error:
        return error

    body = request.get_json(silent=True) or {}

    message = str(
        body.get("message", "")
    ).strip()

    history = body.get("history", [])

    if not message:
        return jsonify({
            "error": "Message is required"
        }), 400

    conversation = []

    for item in history[-20:]:

        role = item.get("role", "user")

        text = item.get("text", "")

        if text:
            conversation.append(
                f"{role}: {text}"
            )

    conversation.append(
        f"user: {message}"
    )

    prompt = f"""
You are Personal Gemini Journal, a thoughtful
private journaling and brainstorming assistant.

Help the user reflect, brainstorm, organize thoughts,
identify patterns, and create practical next steps.

Never claim to know private information that the user
has not provided.

Conversation:
{chr(10).join(conversation)}

Respond naturally and helpfully.
"""

    try:

        client = get_gemini_client()

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )

        reply = response.text or ""

    except Exception as exc:

        app.logger.exception(
            "Gemini request failed"
        )

        return jsonify({
            "error": "Gemini service unavailable",
            "detail": str(exc)
        }), 503

    ref = user_collection(
        user["uid"],
        "conversations"
    ).document()

    ref.set({
        "user_id": user["uid"],
        "message": message,
        "response": reply,
        "created_at": now()
    })

    return jsonify({
        "reply": reply,
        "conversation_id": ref.id
    })


# ============================================================
# SUMMARIES
# ============================================================

@app.post("/api/summaries")
def create_summary():

    user, error = require_user()

    if error:
        return error

    body = request.get_json(silent=True) or {}

    content = str(
        body.get("content", "")
    ).strip()

    if not content:
        return jsonify({
            "error": "Content is required"
        }), 400

    try:

        client = get_gemini_client()

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=f"""
Summarize the following personal journal entry.

Return:
1. Main themes
2. Important points
3. Emotional tone
4. Actionable next steps

Journal:
{content}
"""
        )

        summary = response.text or ""

    except Exception:

        return jsonify({
            "error": "Summary service unavailable"
        }), 503

    ref = user_collection(
        user["uid"],
        "summaries"
    ).document()

    data = {
        "user_id": user["uid"],
        "source": content,
        "summary": summary,
        "created_at": now()
    }

    ref.set(data)

    return jsonify({
        "id": ref.id,
        **clean(data)
    }), 201


@app.get("/api/summaries")
def list_summaries():

    user, error = require_user()

    if error:
        return error

    docs = (
        user_collection(
            user["uid"],
            "summaries"
        )
        .order_by(
            "created_at",
            direction=firestore.Query.DESCENDING
        )
        .stream()
    )

    return jsonify([
        clean({
            "id": doc.id,
            **doc.to_dict()
        })
        for doc in docs
    ])


# ============================================================
# GOALS
# ============================================================

@app.get("/api/goals")
def list_goals():

    user, error = require_user()

    if error:
        return error

    docs = user_collection(
        user["uid"],
        "goals"
    ).stream()

    return jsonify([
        clean({
            "id": doc.id,
            **doc.to_dict()
        })
        for doc in docs
    ])


@app.post("/api/goals")
def create_goal():

    user, error = require_user()

    if error:
        return error

    body = request.get_json(silent=True) or {}

    title = str(
        body.get("title", "")
    ).strip()

    if not title:
        return jsonify({
            "error": "Goal title is required"
        }), 400

    ref = user_collection(
        user["uid"],
        "goals"
    ).document()

    data = {
        "user_id": user["uid"],
        "title": title,
        "status": "active",
        "progress": 0,
        "created_at": now()
    }

    ref.set(data)

    return jsonify({
        "id": ref.id,
        **clean(data)
    }), 201


# ============================================================
# CALENDAR
# ============================================================

@app.get("/api/calendar")
def list_calendar():

    user, error = require_user()

    if error:
        return error

    docs = user_collection(
        user["uid"],
        "calendar"
    ).stream()

    return jsonify([
        clean({
            "id": doc.id,
            **doc.to_dict()
        })
        for doc in docs
    ])


@app.post("/api/calendar")
def create_calendar():

    user, error = require_user()

    if error:
        return error

    body = request.get_json(silent=True) or {}

    ref = user_collection(
        user["uid"],
        "calendar"
    ).document()

    data = {
        "user_id": user["uid"],
        "title": body.get(
            "title",
            "Untitled event"
        ),
        "date": body.get("date", body.get("event_date", "")),
        "time": body.get("time", body.get("event_time", "")),
        "created_at": now()
    }

    ref.set(data)

    return jsonify({
        "id": ref.id,
        **clean(data)
    }), 201


# ============================================================
# BOOKMARKS
# ============================================================

@app.get("/api/bookmarks")
def list_bookmarks():

    user, error = require_user()

    if error:
        return error

    docs = user_collection(
        user["uid"],
        "bookmarks"
    ).stream()

    return jsonify([
        clean({
            "id": doc.id,
            **doc.to_dict()
        })
        for doc in docs
    ])


@app.post("/api/bookmarks")
def create_bookmark():

    user, error = require_user()

    if error:
        return error

    body = request.get_json(silent=True) or {}

    ref = user_collection(
        user["uid"],
        "bookmarks"
    ).document()

    data = {
        "user_id": user["uid"],
        "title": body.get("title", ""),
        "content": body.get("content", ""),
        "created_at": now()
    }

    ref.set(data)

    return jsonify({
        "id": ref.id,
        **clean(data)
    }), 201


# ============================================================
# SEARCH
# ============================================================

@app.get("/api/search")
def search():

    user, error = require_user()

    if error:
        return error

    query = request.args.get(
        "q",
        ""
    ).strip().lower()

    if not query:
        return jsonify([])

    results = []

    for collection in [
        "journals",
        "goals",
        "summaries",
        "bookmarks"
    ]:

        docs = user_collection(
            user["uid"],
            collection
        ).stream()

        for doc in docs:

            data = doc.to_dict()

            searchable = json.dumps(
                data,
                default=str
            ).lower()

            if query in searchable:

                results.append({
                    "collection": collection,
                    "id": doc.id,
                    **clean(data)
                })

    return jsonify(results[:100])


# ============================================================
# ANALYTICS
# ============================================================

@app.get("/api/analytics")
def analytics():

    user, error = require_user()

    if error:
        return error

    result = {}

    for collection in [
        "journals",
        "conversations",
        "summaries",
        "goals",
        "calendar",
        "bookmarks"
    ]:

        result[collection] = len(list(
            user_collection(
                user["uid"],
                collection
            ).stream()
        ))

    result["total_activity"] = sum(
        result.values()
    )

    return jsonify(result)


# ============================================================
# INSIGHTS
# ============================================================

@app.get("/api/insights")
def insights():

    user, error = require_user()

    if error:
        return error

    journals = list(
        user_collection(
            user["uid"],
            "journals"
        ).stream()
    )

    if not journals:

        return jsonify({
            "insight": "Start journaling to discover patterns."
        })

    combined = "\n\n".join(
        str(
            doc.to_dict().get(
                "content",
                ""
            )
        )
        for doc in journals[-10:]
    )

    try:

        client = get_gemini_client()

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=f"""
Analyze these journal entries and provide
three useful personal productivity/reflection insights.

Do not diagnose medical conditions.

Entries:
{combined}
"""
        )

        return jsonify({
            "insight": response.text or ""
        })

    except Exception:

        return jsonify({
            "insight": "Insights are temporarily unavailable."
        })


# ============================================================
# DECISIONLENS
# ORIGINAL FEATURE ENHANCEMENT
# ============================================================

@app.post("/api/decisionlens")
def decisionlens():

    user, error = require_user()

    if error:
        return error

    body = request.get_json(silent=True) or {}

    decision = str(
        body.get("decision", "")
    ).strip()

    if not decision:
        return jsonify({
            "error": "Decision is required"
        }), 400

    context = str(
        body.get("context", "")
    ).strip()

    prompt = f"""
You are DecisionLens, an AI decision-reflection
feature inside Personal Gemini Journal.

Decision:
{decision}

Context:
{context}

Analyze the decision using:

1. Objective
2. Options
3. Benefits
4. Risks
5. Unknowns
6. Reversible vs irreversible factors
7. Questions to investigate
8. Recommended next step

Do not make the final decision for the user.
Expose assumptions and uncertainty.
"""

    try:

        client = get_gemini_client()

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )

        analysis = response.text or ""

    except Exception:

        return jsonify({
            "error": "DecisionLens unavailable"
        }), 503

    ref = user_collection(
        user["uid"],
        "decisions"
    ).document()

    data = {
        "user_id": user["uid"],
        "decision": decision,
        "context": context,
        "analysis": analysis,
        "created_at": now()
    }

    ref.set(data)

    return jsonify({
        "id": ref.id,
        **clean(data)
    }), 201




# ============================================================
# REFERENCE UI UPDATES
# GOALS / CALENDAR / BOOKMARKS
# ============================================================

@app.put("/api/goals/<goal_id>")
def update_goal(goal_id):

    user, error = require_user()

    if error:
        return error

    body = request.get_json(silent=True) or {}

    updates = {}

    if "title" in body:
        title = str(body.get("title") or "").strip()
        if title:
            updates["title"] = title

    if "progress" in body:
        try:
            progress = int(float(body.get("progress", 0)))
        except (TypeError, ValueError):
            progress = 0

        updates["progress"] = max(
            0,
            min(100, progress)
        )

    if "status" in body:
        updates["status"] = str(
            body.get("status") or "active"
        ).strip() or "active"

    updates["updated_at"] = now()

    user_collection(
        user["uid"],
        "goals"
    ).document(goal_id).update(updates)

    return jsonify({
        "id": goal_id,
        **clean(updates)
    })


@app.delete("/api/goals/<goal_id>")
def delete_goal(goal_id):

    user, error = require_user()

    if error:
        return error

    user_collection(
        user["uid"],
        "goals"
    ).document(goal_id).delete()

    return jsonify({
        "success": True,
        "id": goal_id
    })


@app.put("/api/calendar/<event_id>")
def update_calendar(event_id):

    user, error = require_user()

    if error:
        return error

    body = request.get_json(silent=True) or {}

    updates = {}

    if "title" in body:
        updates["title"] = str(
            body.get("title") or ""
        ).strip()

    if "date" in body or "event_date" in body:
        updates["date"] = body.get(
            "date",
            body.get("event_date", "")
        )

    if "time" in body or "event_time" in body:
        updates["time"] = body.get(
            "time",
            body.get("event_time", "")
        )

    updates["updated_at"] = now()

    user_collection(
        user["uid"],
        "calendar"
    ).document(event_id).update(updates)

    return jsonify({
        "id": event_id,
        **clean(updates)
    })


@app.delete("/api/calendar/<event_id>")
def delete_calendar(event_id):

    user, error = require_user()

    if error:
        return error

    user_collection(
        user["uid"],
        "calendar"
    ).document(event_id).delete()

    return jsonify({
        "success": True,
        "id": event_id
    })


@app.put("/api/bookmarks/<bookmark_id>")
def update_bookmark(bookmark_id):

    user, error = require_user()

    if error:
        return error

    body = request.get_json(silent=True) or {}

    updates = {
        "updated_at": now()
    }

    if "title" in body:
        updates["title"] = str(
            body.get("title") or ""
        ).strip()

    if "content" in body:
        updates["content"] = str(
            body.get("content") or ""
        ).strip()

    user_collection(
        user["uid"],
        "bookmarks"
    ).document(bookmark_id).update(updates)

    return jsonify({
        "id": bookmark_id,
        **clean(updates)
    })


@app.delete("/api/bookmarks/<bookmark_id>")
def delete_bookmark(bookmark_id):

    user, error = require_user()

    if error:
        return error

    user_collection(
        user["uid"],
        "bookmarks"
    ).document(bookmark_id).delete()

    return jsonify({
        "success": True,
        "id": bookmark_id
    })



# ============================================================
# FIRESTORE SECURITY TEST ENDPOINT
# ============================================================

@app.get("/api/security/profile")
def security_profile():

    user, error = require_user()

    if error:
        return error

    uid = user["uid"]

    ref = (
        get_db()
        .collection("users")
        .document(uid)
    )

    snapshot = ref.get()

    if not snapshot.exists:

        ref.set({
            "uid": uid,
            "email": user.get("email"),
            "created_at": now()
        })

    return jsonify({
        "uid": uid,
        "message": "Authenticated user profile is isolated by Firebase UID"
    })


# ============================================================
# STARTUP
# ============================================================

initialize_firebase()


if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=int(
            os.getenv("PORT", "8080")
        ),
        debug=False
    )
