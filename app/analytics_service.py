from app.journal_service import list_journals
from app.goals_service import list_goals
from app.calendar_service import list_events
from app.firestore_service import list_conversations


def get_analytics(uid):

    journals = list_journals(uid) or []
    conversations = list_conversations(uid) or []
    goals = list_goals(uid) or []
    events = list_events(uid) or []

    completed_goals = sum(
        1
        for goal in goals
        if goal.get("completed", False)
    )

    total_progress = sum(
        int(goal.get("progress", 0) or 0)
        for goal in goals
    )

    average_goal_progress = (
        round(
            total_progress / len(goals),
            1
        )
        if goals
        else 0
    )

    goal_completion_rate = (
        round(
            completed_goals / len(goals) * 100,
            1
        )
        if goals
        else 0
    )

    total_activity = (
        len(journals)
        + len(conversations)
        + len(goals)
        + len(events)
    )

    return {
        "total_activity": total_activity,

        "journals": len(journals),

        "conversations": len(conversations),

        "goals": len(goals),

        "completed_goals": completed_goals,

        "goal_completion_rate":
            goal_completion_rate,

        "average_goal_progress":
            average_goal_progress,

        "calendar_events": len(events),
    }
