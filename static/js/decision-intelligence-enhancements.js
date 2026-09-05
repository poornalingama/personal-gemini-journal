/*
 * Decision Intelligence Enhancements
 * Works with the existing DecisionLens HTML.
 * Does not replace existing DecisionLens functionality.
 */

(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function createCard(id, title, content) {
        let card = $(id);

        if (card) return card;

        card = document.createElement("div");
        card.id = id;
        card.className = "dl-intelligence-card";

        card.innerHTML = `
            <div class="dl-intelligence-head">
                <h4>${title}</h4>
            </div>
            <div class="dl-intelligence-content">
                ${content}
            </div>
        `;

        return card;
    }

    function addStyles() {
        if ($("dl-intelligence-enhancement-styles")) return;

        const style = document.createElement("style");
        style.id = "dl-intelligence-enhancement-styles";

        style.textContent = `
            .dl-intelligence-card {
                margin-top: 16px;
                padding: 18px;
                border: 1px solid rgba(100,100,120,.15);
                border-radius: 14px;
                background: rgba(255,255,255,.55);
            }

            .dl-intelligence-head h4 {
                margin: 0 0 10px;
                font-size: 16px;
            }

            .dl-intelligence-content {
                line-height: 1.6;
            }

            .dl-intelligence-grid {
                display: grid;
                grid-template-columns:
                    repeat(auto-fit, minmax(150px, 1fr));
                gap: 10px;
                margin-top: 12px;
            }

            .dl-intelligence-metric {
                padding: 12px;
                border: 1px solid rgba(0,0,0,.08);
                border-radius: 10px;
            }

            .dl-intelligence-label {
                font-size: 12px;
                opacity: .65;
            }

            .dl-intelligence-value {
                margin-top: 4px;
                font-size: 18px;
                font-weight: 700;
            }

            .dl-intelligence-note {
                margin-top: 12px;
                padding: 12px;
                border-radius: 10px;
                background: rgba(100,80,220,.06);
            }

            .dl-intelligence-input {
                width: 100%;
                box-sizing: border-box;
                margin-top: 8px;
                padding: 10px;
                border-radius: 8px;
                border: 1px solid rgba(0,0,0,.15);
                font: inherit;
            }

            textarea.dl-intelligence-input {
                min-height: 85px;
                resize: vertical;
            }

            .dl-intelligence-btn {
                margin-top: 10px;
                padding: 9px 14px;
                border: 0;
                border-radius: 8px;
                cursor: pointer;
                font: inherit;
                font-weight: 600;
            }
        `;

        document.head.appendChild(style);
    }


    /*
     * DECISION AGENT
     */

    function enhanceAgent() {
        const agentButton = $("dl-agent");

        if (!agentButton) return;
        if ($("dl-agent-intelligence")) return;

        const card = createCard(
            "dl-agent-intelligence",
            "🧠 Decision Health",
            `
                <div class="dl-intelligence-grid">
                    <div class="dl-intelligence-metric">
                        <div class="dl-intelligence-label">
                            Decision Status
                        </div>
                        <div class="dl-intelligence-value">
                            Ready for Analysis
                        </div>
                    </div>

                    <div class="dl-intelligence-metric">
                        <div class="dl-intelligence-label">
                            Re-evaluation
                        </div>
                        <div class="dl-intelligence-value">
                            Available
                        </div>
                    </div>
                </div>

                <div class="dl-intelligence-note">
                    Run the Decision Agent first. Re-evaluate the decision
                    when your priorities, timeline, money, opportunities or
                    other important circumstances change.
                </div>
            `
        );

        agentButton.closest(".dl-actions")
            ?.insertAdjacentElement("afterend", card);
    }


    /*
     * DECISION COMPARISON
     */

    function enhanceComparison() {
        const result = $("dl-compare-result");

        if (!result) return;

        if ($("dl-compare-intelligence")) return;

        const card = createCard(
            "dl-compare-intelligence",
            "🧠 Comparison Insight",
            `
                <div class="dl-intelligence-note">
                    Compare two saved decisions to understand which one
                    currently has the stronger recommendation, confidence,
                    risk profile and practical fit.
                </div>

                <div class="dl-intelligence-grid">
                    <div class="dl-intelligence-metric">
                        <div class="dl-intelligence-label">
                            Compare
                        </div>
                        <div class="dl-intelligence-value">
                            Recommendation
                        </div>
                    </div>

                    <div class="dl-intelligence-metric">
                        <div class="dl-intelligence-label">
                            Evaluate
                        </div>
                        <div class="dl-intelligence-value">
                            Risk & Confidence
                        </div>
                    </div>

                    <div class="dl-intelligence-metric">
                        <div class="dl-intelligence-label">
                            Decide
                        </div>
                        <div class="dl-intelligence-value">
                            Best Current Fit
                        </div>
                    </div>
                </div>
            `
        );

        result.insertAdjacentElement("afterend", card);
    }


    /*
     * OUTCOME TRACKER
     */

    function enhanceOutcome() {
        const predictionResult =
            $("dl-prediction-result");

        if (!predictionResult) return;
        if ($("dl-outcome-intelligence")) return;

        const card = createCard(
            "dl-outcome-intelligence",
            "🎯 Decision Learning",
            `
                <div class="dl-intelligence-note">
                    After recording the outcome, compare what you expected
                    with what actually happened. This helps you understand
                    whether your assumptions and AI analysis were accurate.
                </div>

                <label>
                    What did you originally expect?
                    <textarea
                        id="dl-expected-outcome"
                        class="dl-intelligence-input"
                        placeholder="Describe what you expected to happen..."
                    ></textarea>
                </label>

                <label>
                    What did you learn from the actual result?
                    <textarea
                        id="dl-outcome-learning"
                        class="dl-intelligence-input"
                        placeholder="What was different from your expectation?"
                    ></textarea>
                </label>

                <button
                    type="button"
                    class="secondary-button dl-intelligence-btn"
                    id="dl-save-learning">
                    Save Decision Learning
                </button>

                <div
                    id="dl-learning-message"
                    class="dl-intelligence-note"
                    hidden>
                </div>
            `
        );

        predictionResult
            .insertAdjacentElement("afterend", card);

        $("dl-save-learning")
            ?.addEventListener("click", () => {

                const expected =
                    $("dl-expected-outcome")?.value
                        .trim();

                const learning =
                    $("dl-outcome-learning")?.value
                        .trim();

                if (!expected && !learning) {
                    alert(
                        "Add your expected outcome or what you learned first."
                    );
                    return;
                }

                const data = {
                    expected,
                    learning,
                    saved_at:
                        new Date().toISOString()
                };

                localStorage.setItem(
                    "dl-decision-learning",
                    JSON.stringify(data)
                );

                const message =
                    $("dl-learning-message");

                if (message) {
                    message.hidden = false;
                    message.textContent =
                        "Decision learning saved. Future decisions can be reviewed against this experience.";
                }
            });

        try {
            const saved =
                JSON.parse(
                    localStorage.getItem(
                        "dl-decision-learning"
                    ) || "null"
                );

            if (saved) {
                $("dl-expected-outcome").value =
                    saved.expected || "";

                $("dl-outcome-learning").value =
                    saved.learning || "";
            }
        } catch (_) {}
    }


    /*
     * DECISION HISTORY
     */

    function enhanceHistory() {
        const historyResult =
            $("dl-history-result");

        if (!historyResult) return;
        if ($("dl-history-intelligence")) return;

        const card = createCard(
            "dl-history-intelligence",
            "📊 Personal Decision Patterns",
            `
                <div class="dl-intelligence-note">
                    Your decision history becomes more useful as outcomes are
                    recorded. Look for repeated patterns in successful,
                    unsuccessful and partially successful decisions.
                </div>

                <div class="dl-intelligence-grid">

                    <div class="dl-intelligence-metric">
                        <div class="dl-intelligence-label">
                            Focus
                        </div>
                        <div class="dl-intelligence-value">
                            Patterns
                        </div>
                    </div>

                    <div class="dl-intelligence-metric">
                        <div class="dl-intelligence-label">
                            Learn
                        </div>
                        <div class="dl-intelligence-value">
                            Assumptions
                        </div>
                    </div>

                    <div class="dl-intelligence-metric">
                        <div class="dl-intelligence-label">
                            Improve
                        </div>
                        <div class="dl-intelligence-value">
                            Future Choices
                        </div>
                    </div>

                </div>
            `
        );

        historyResult
            .insertAdjacentElement("afterend", card);
    }


    /*
     * INITIALISE
     *
     * DecisionLens updates parts of the interface dynamically.
     * Re-check the existing tool containers whenever the page changes.
     */

    let refreshTimer = null;
    let observerStarted = false;

    function initialise() {
        addStyles();

        enhanceAgent();
        enhanceComparison();
        enhanceOutcome();
        enhanceHistory();
    }


    function safelyInitialise() {

        try {

            initialise();

        } catch (error) {

            console.error(
                "Decision Intelligence enhancement error:",
                error
            );

        }

    }


    function scheduleInitialise(delay = 120) {

        if (refreshTimer) {

            clearTimeout(
                refreshTimer
            );

        }

        refreshTimer =
            setTimeout(
                safelyInitialise,
                delay
            );

    }


    function startDecisionLensObserver() {

        if (
            observerStarted ||
            !document.body
        ) {
            return;
        }

        observerStarted = true;

        const observer =
            new MutationObserver(
                () => {

                    scheduleInitialise(
                        150
                    );

                }
            );

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

    }


    function startEnhancements() {

        safelyInitialise();

        startDecisionLensObserver();

        scheduleInitialise(
            300
        );

        scheduleInitialise(
            800
        );

    }


    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startEnhancements
        );

    } else {

        startEnhancements();

    }


    /*
     * Re-check after any DecisionLens interaction.
     */

    document.addEventListener(
        "click",
        () => {

            scheduleInitialise(
                200
            );

        },
        true
    );


    window.addEventListener(
        "load",
        () => {

            scheduleInitialise(
                300
            );

        }
    );


    window.addEventListener(
        "popstate",
        () => {

            scheduleInitialise(
                200
            );

        }
    );

})();
