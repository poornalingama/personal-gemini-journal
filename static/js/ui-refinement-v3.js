(function () {
    "use strict";

    if (window.__pgjUiRefinementV3Loaded) return;
    window.__pgjUiRefinementV3Loaded = true;

    const $ = (id) => document.getElementById(id);

    const LABELS = {
        journals: "Journal Entries",
        goals: "Goals",
        completed_goals: "Completed Goals",
        calendar_events: "Calendar Events",
        average_goal_progress: "Average Goal Progress",
        goal_completion_rate: "Goal Completion Rate"
    };

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function isAnalyticsVisible() {
        return $("analytics")?.classList.contains("active");
    }

    async function renderRefinedAnalytics() {
        const host = $("analytics-data");
        if (!host || typeof window.api !== "function") return;

        try {
            const data = await window.api("/api/analytics");
            if (!isAnalyticsVisible()) return;

            const metrics = [
                ["journals", Number(data?.journals || 0)],
                ["goals", Number(data?.goals || 0)],
                ["completed_goals", Number(data?.completed_goals || 0)],
                ["calendar_events", Number(data?.calendar_events || 0)],
                ["average_goal_progress", Number(data?.average_goal_progress || 0)],
                ["goal_completion_rate", Number(data?.goal_completion_rate || 0)]
            ];

            const activityTotal = metrics
                .filter(([key]) =>
                    ["journals", "goals", "calendar_events"].includes(key)
                )
                .reduce((sum, [, value]) => sum + value, 0);

            const chartMetrics = metrics.slice(0, 4);
            const maxValue = Math.max(
                1,
                ...chartMetrics.map(([, value]) => value)
            );

            host.innerHTML = `
                <section class="pgj-analytics-shell">
                    <div class="pgj-analytics-top">
                        <div class="pgj-analytics-summary">
                            <span class="pgj-kicker">WORKSPACE PULSE</span>
                            <h3>${activityTotal} tracked items</h3>
                            <p>A responsive overview of your journals, goals and calendar activity.</p>
                        </div>
                        <div class="pgj-analytics-total" aria-label="${activityTotal} total activity">
                            <strong>${activityTotal}</strong>
                            <span>Total activity</span>
                        </div>
                    </div>

                    <div class="pgj-chart-card">
                        <div class="pgj-chart-head">
                            <div>
                                <span class="pgj-kicker">ACTIVITY CHART</span>
                                <h3>Workspace activity</h3>
                            </div>
                            <span>Live data</span>
                        </div>

                        <div class="pgj-bar-chart">
                            ${chartMetrics.map(([key, value]) => {
                                const height = Math.max(8, Math.round((value / maxValue) * 100));
                                return `
                                    <button class="pgj-chart-item" type="button"
                                        data-pgj-metric="${escapeHtml(key)}"
                                        aria-label="View ${escapeHtml(LABELS[key])}: ${value}">
                                        <span class="pgj-bar-wrap">
                                            <i style="height:${height}%"></i>
                                        </span>
                                        <strong>${value}</strong>
                                        <small>${escapeHtml(LABELS[key])}</small>
                                    </button>
                                `;
                            }).join("")}
                        </div>
                    </div>

                    <div class="pgj-metric-grid">
                        ${metrics.map(([key, value]) => `
                            <button type="button" class="pgj-metric-card"
                                data-pgj-metric="${escapeHtml(key)}">
                                <span>${escapeHtml(LABELS[key])}</span>
                                <strong>${escapeHtml(value)}</strong>
                                <small>View detail →</small>
                            </button>
                        `).join("")}
                    </div>

                    <div class="pgj-metric-detail" id="pgj-metric-detail" aria-live="polite">
                        <span>Select a chart bar or metric card to inspect it.</span>
                    </div>
                </section>
            `;

            const detail = $("pgj-metric-detail");
            const explain = (key) => {
                const value = Number(data?.[key] ?? 0);
                const descriptions = {
                    journals: "The number of journal entries currently stored in your workspace.",
                    goals: "The number of goals you are currently tracking.",
                    completed_goals: "The number of tracked goals marked as completed.",
                    calendar_events: "The number of calendar events currently recorded.",
                    average_goal_progress: "The average progress percentage across all goals.",
                    goal_completion_rate: "The percentage of tracked goals that are completed."
                };
                detail.innerHTML = `
                    <span class="pgj-kicker">SELECTED METRIC</span>
                    <strong>${escapeHtml(LABELS[key] || key)}: ${escapeHtml(value)}</strong>
                    <p>${escapeHtml(descriptions[key] || "Current workspace metric.")}</p>
                `;
            };

            host.querySelectorAll("[data-pgj-metric]").forEach((button) => {
                button.addEventListener("click", () => {
                    explain(button.dataset.pgjMetric);
                    host.querySelectorAll(".pgj-metric-card, .pgj-chart-item")
                        .forEach((item) => item.classList.remove("is-selected"));
                    button.classList.add("is-selected");
                });
            });

        } catch (error) {
            console.error("Refined analytics failed", error);
        }
    }

    function cleanInsightText(text) {
        return String(text || "")
            .replace(/^\s*#+\s*/gm, "")
            .replace(/\*\*/g, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    /*
     * AI INSIGHTS HOTFIX
     *
     * The previous implementation used a MutationObserver and rewrote
     * #insight-output while the AI generator was still updating it.
     * That could create a feedback loop and make the page appear frozen.
     *
     * Keep the AI generator's DOM completely untouched. The compact look
     * is now handled only by CSS.
     */
    function refineInsights() {
        // AI Insights are rendered once by static/js/insights.js.
        // Do not observe or rewrite generated insight DOM.
        return;
    }

    function bindSectionNavigation() {
        document.querySelectorAll("[data-section]").forEach((button) => {
            button.addEventListener("click", () => {
                if (button.dataset.section === "analytics") {
                    setTimeout(renderRefinedAnalytics, 120);
                }
            });
        });

        const analytics = $("analytics");
        if (analytics) {
            const observer = new MutationObserver(() => {
                if (isAnalyticsVisible()) {
                    setTimeout(renderRefinedAnalytics, 50);
                }
            });
            observer.observe(analytics, {
                attributes: true,
                attributeFilter: ["class"]
            });
        }
    }

    function start() {
        refineInsights();
        bindSectionNavigation();
        if (isAnalyticsVisible()) renderRefinedAnalytics();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();

