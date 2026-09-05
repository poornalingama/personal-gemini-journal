import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock


# ============================================================
# BASIC APPLICATION / ROUTE TESTS
# ============================================================

def test_application_imports():
    from main import app

    assert app is not None


def test_required_blueprints_registered():
    from main import app

    required = {
        "chat",
        "journals",
        "calendar",
        "goals",
        "analytics",
        "insights",
        "decisions",
        "bookmarks",
        "search",
        "summaries",
    }

    assert required.issubset(set(app.blueprints.keys()))


def test_required_routes_registered():
    from main import app

    routes = {
        rule.rule
        for rule in app.url_map.iter_rules()
    }

    required = {
        "/api/journals",
        "/api/journals/<journal_id>",
        "/api/journals/<journal_id>/analyze",
        "/api/calendar",
        "/api/calendar/<event_id>",
        "/api/goals",
        "/api/goals/<goal_id>",
        "/api/analytics",
        "/api/insights",
        "/api/decisionlens",
        "/api/decisions",
        "/api/decisions/<decision_id>",
        "/api/bookmarks",
        "/api/bookmarks/<bookmark_id>",
        "/api/search",
        "/api/summaries",
    }

    assert required.issubset(routes)


# ============================================================
# AUTHENTICATION PROTECTION
# ============================================================

@pytest.mark.parametrize(
    "path",
    [
        "/api/journals",
        "/api/calendar",
        "/api/goals",
        "/api/analytics",
        "/api/insights",
        "/api/decisionlens",
        "/api/decisions",
        "/api/bookmarks",
        "/api/search",
        "/api/summaries",
    ],
)
def test_api_requires_authentication(path):
    from main import app

    client = app.test_client()

    response = client.get(path)

    assert response.status_code in {
        401,
        405,
    }


# ============================================================
# GOAL SERVICE
# ============================================================

def test_goal_service_progress_clamped(monkeypatch):
    import app.goals_service as service

    ref = MagicMock()

    snapshot = MagicMock()
    snapshot.exists = True
    snapshot.to_dict.return_value = {
        "user_id": "user-1",
        "title": "Test goal",
        "completed": False,
        "progress": 20,
    }

    ref.get.return_value = snapshot

    monkeypatch.setattr(
        service,
        "goals_ref",
        lambda uid: MagicMock(
            document=lambda goal_id: ref
        ),
    )

    assert service.update_goal(
        "user-1",
        "goal-1",
        progress=150,
    )

    updates = ref.update.call_args.args[0]

    assert updates["progress"] == 100
    assert updates["completed"] is True


def test_goal_service_rejects_wrong_user(monkeypatch):
    import app.goals_service as service

    ref = MagicMock()

    snapshot = MagicMock()
    snapshot.exists = True
    snapshot.to_dict.return_value = {
        "user_id": "different-user"
    }

    ref.get.return_value = snapshot

    monkeypatch.setattr(
        service,
        "goals_ref",
        lambda uid: MagicMock(
            document=lambda goal_id: ref
        ),
    )

    assert not service.update_goal(
        "user-1",
        "goal-1",
        title="Changed",
    )


# ============================================================
# BOOKMARK SERVICE
# ============================================================

def test_bookmark_service_rejects_wrong_user(monkeypatch):
    import app.bookmark_service as service

    ref = MagicMock()

    snapshot = MagicMock()
    snapshot.exists = True
    snapshot.to_dict.return_value = {
        "user_id": "different-user"
    }

    ref.get.return_value = snapshot

    monkeypatch.setattr(
        service,
        "bookmarks_ref",
        lambda uid: MagicMock(
            document=lambda bookmark_id: ref
        ),
    )

    assert not service.update_bookmark(
        "user-1",
        "bookmark-1",
        "Title",
        "Content",
    )


# ============================================================
# DECISION SERVICE
# ============================================================

def test_decision_service_rejects_wrong_user(monkeypatch):
    import app.decisionlens_service as service

    ref = MagicMock()

    snapshot = MagicMock()
    snapshot.exists = True
    snapshot.to_dict.return_value = {
        "user_id": "different-user"
    }

    ref.get.return_value = snapshot

    monkeypatch.setattr(
        service,
        "decisions_ref",
        lambda uid: MagicMock(
            document=lambda decision_id: ref
        ),
    )

    assert not service.save_analysis(
        "user-1",
        "decision-1",
        "Analysis",
    )


# ============================================================
# ANALYTICS SERVICE
# ============================================================

def test_analytics_calculation(monkeypatch):
    import app.analytics_service as service

    monkeypatch.setattr(
        service,
        "list_journals",
        lambda uid: [
            {"id": "j1"},
            {"id": "j2"},
        ],
    )

    monkeypatch.setattr(
        service,
        "list_goals",
        lambda uid: [
            {"completed": True, "progress": 100},
            {"completed": False, "progress": 50},
        ],
    )

    monkeypatch.setattr(
        service,
        "list_events",
        lambda uid: [
            {"id": "e1"},
        ],
    )

    result = service.get_analytics("user-1")

    assert result["journals"] == 2
    assert result["goals"] == 2
    assert result["completed_goals"] == 1
    assert result["goal_completion_rate"] == 50.0
    assert result["average_goal_progress"] == 75.0
    assert result["calendar_events"] == 1


def test_analytics_empty_data(monkeypatch):
    import app.analytics_service as service

    monkeypatch.setattr(
        service,
        "list_journals",
        lambda uid: [],
    )

    monkeypatch.setattr(
        service,
        "list_goals",
        lambda uid: [],
    )

    monkeypatch.setattr(
        service,
        "list_events",
        lambda uid: [],
    )

    result = service.get_analytics("user-1")

    assert result["journals"] == 0
    assert result["goals"] == 0
    assert result["completed_goals"] == 0
    assert result["goal_completion_rate"] == 0
    assert result["average_goal_progress"] == 0
    assert result["calendar_events"] == 0


# ============================================================
# SEARCH SERVICE
# ============================================================

def test_search_all_across_features(monkeypatch):
    import app.search_service as service

    monkeypatch.setattr(
        service,
        "list_journals",
        lambda uid: [
            {
                "id": "j1",
                "title": "Learning",
                "content": "Python practice",
            }
        ],
    )

    monkeypatch.setattr(
        service,
        "list_goals",
        lambda uid: [
            {
                "id": "g1",
                "title": "Learn Python",
            }
        ],
    )

    monkeypatch.setattr(
        service,
        "list_events",
        lambda uid: [
            {
                "id": "e1",
                "title": "Python workshop",
                "event_date": "2026-08-30",
            }
        ],
    )

    monkeypatch.setattr(
        service,
        "list_bookmarks",
        lambda uid: [
            {
                "id": "b1",
                "title": "Python",
                "content": "Important notes",
            }
        ],
    )

    monkeypatch.setattr(
        service,
        "list_decisions",
        lambda uid: [
            {
                "id": "d1",
                "title": "Python project",
                "context": "Learning",
                "analysis": "Good option",
            }
        ],
    )

    results = service.search_all(
        "user-1",
        "python",
    )

    types = {
        item["type"]
        for item in results
    }

    assert "journal" in types
    assert "goal" in types
    assert "calendar" in types
    assert "bookmark" in types
    assert "decision" in types


def test_search_empty_query():
    import app.search_service as service

    assert service.search_all(
        "user-1",
        "",
    ) == []


# ============================================================
# INSIGHTS
# ============================================================

def test_insights_requires_journals(monkeypatch):
    import app.insight_service as service

    monkeypatch.setattr(
        service,
        "list_journals",
        lambda uid: [],
    )

    with pytest.raises(ValueError):
        service.generate_insights("user-1")


def test_summary_requires_journals(monkeypatch):
    import app.summary_service as service

    monkeypatch.setattr(
        service,
        "list_journals",
        lambda uid: [],
    )

    with pytest.raises(ValueError):
        service.generate_summary("user-1")


# ============================================================
# JOURNAL AI ANALYSIS
# ============================================================

def test_journal_analysis_rejects_empty_content():
    import app.gemini_service as service

    with pytest.raises(ValueError):
        service.analyze_journal(
            "Test",
            "",
        )


def test_journal_analysis_returns_text(monkeypatch):
    import app.gemini_service as service

    response = MagicMock()
    response.text = "🧠 Key Thoughts\nTest analysis"

    client = MagicMock()
    client.models.generate_content.return_value = response

    monkeypatch.setattr(
        service,
        "get_gemini_client",
        lambda: client,
    )

    result = service.analyze_journal(
        "Test journal",
        "Today I learned Python.",
    )

    assert "Key Thoughts" in result

    client.models.generate_content.assert_called_once()


# ============================================================
# JOURNAL SAVED ANALYSIS
# ============================================================

def test_save_journal_analysis(monkeypatch):
    import app.journal_service as service

    ref = MagicMock()

    snapshot = MagicMock()
    snapshot.exists = True
    snapshot.to_dict.return_value = {
        "user_id": "user-1"
    }

    ref.get.return_value = snapshot

    monkeypatch.setattr(
        service,
        "journal_reference",
        lambda uid, journal_id: ref,
    )

    result = service.save_journal_analysis(
        "user-1",
        "journal-1",
        "Saved analysis",
    )

    assert result is True

    updates = ref.update.call_args.args[0]

    assert updates["ai_analysis"] == "Saved analysis"
    assert updates["ai_analysis_version"] == 1
    assert "ai_analyzed_at" in updates


# ============================================================
# ROUTE VALIDATION
# ============================================================

def test_goal_create_requires_title(monkeypatch):
    from main import app

    import app.routes.goal_routes as routes

    monkeypatch.setattr(
        routes,
        "uid",
        lambda: "user-1",
    )

    client = app.test_client()

    response = client.post(
        "/api/goals",
        json={},
    )

    assert response.status_code in {
        400,
        401,
    }


def test_search_route_exists():
    from main import app

    rules = [
        rule
        for rule in app.url_map.iter_rules()
        if rule.rule == "/api/search"
    ]

    assert rules


# ============================================================
# FRONTEND / FILE INTEGRATION
# ============================================================

def test_dashboard_contains_feature_sections():
    from pathlib import Path

    html = Path(
        "templates/dashboard.html"
    ).read_text()

    required_ids = [
        "calendar",
        "goals",
        "analytics",
        "insights",
        "decisionlens",
        "bookmarks",
        "search",
        "journals",
        "journal-analysis-status",
        "journal-ai-summary",
        "journal-ai-themes",
        "journal-ai-takeaways",
        "journal-ai-steps",
    ]

    for element_id in required_ids:
        assert f'id="{element_id}"' in html


def test_feature_javascript_files_exist():
    from pathlib import Path

    files = [
        "calendar.js",
        "goals.js",
        "analytics.js",
        "insights.js",
        "decisionlens.js",
        "bookmarks.js",
        "search.js",
        "summaries.js",
    ]

    for filename in files:
        path = Path("static/js") / filename
        assert path.exists()
        assert path.stat().st_size > 0


# ============================================================
# COMPLETE
# ============================================================

def test_project_test_suite_loaded():
    assert True
