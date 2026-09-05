(() => {

    "use strict";


    if (window.__decisionLensReferenceRailV2) {
        return;
    }


    window.__decisionLensReferenceRailV2 = true;


    const $ = id =>
        document.getElementById(id);


    let current = null;
    let currentId = null;


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    function parseAnalysis(value) {

        if (!value) {
            return {};
        }


        if (
            typeof value === "object"
        ) {
            return value;
        }


        try {

            return JSON.parse(
                String(value)
                    .replace(
                        /^```json\s*/i,
                        ""
                    )
                    .replace(
                        /```$/i,
                        ""
                    )
                    .trim()
            );

        } catch (_) {

            return {};

        }

    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return String(value);
        }


        return date.toLocaleString(
            [],
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    }


    function activeDecisionId() {

        return (
            document
                .querySelector(
                    ".dl-decision-card.active"
                )
                ?.dataset
                ?.decisionId
            ||
            currentId
        );

    }


    function confidenceValue(value) {

        const number =
            Number(value);


        if (
            !Number.isFinite(number)
        ) {
            return null;
        }


        if (
            number > 0 &&
            number <= 1
        ) {
            return Math.round(
                number * 100
            );
        }


        return Math.round(number);

    }


    function renderRail() {

        const snapshot =
            $("dl-reference-snapshot");

        const outcome =
            $("dl-reference-outcome");


        if (
            !snapshot ||
            !outcome
        ) {
            return;
        }


        if (!current) {

            snapshot.innerHTML =
                '<p class="dl-ref-empty">'
                +
                'Select a decision to see its snapshot.'
                +
                '</p>';


            outcome.innerHTML =
                '<p class="dl-ref-empty">'
                +
                'No outcome recorded yet.'
                +
                '</p>';

            return;

        }


        const analysis =
            parseAnalysis(
                current.analysis ||
                current.ai_analysis
            );


        const confidence =
            confidenceValue(
                analysis.confidence ??
                analysis.ai_confidence ??
                analysis.confidence_score
            );


        snapshot.innerHTML = `

            <div class="dl-ref-row">

                <span>
                    Category
                </span>

                <b>
                    ${
                        escapeHtml(
                            current.category ||
                            "Personal Growth"
                        )
                    }
                </b>

            </div>


            <div class="dl-ref-row">

                <span>
                    Priority
                </span>

                <b>
                    ${
                        escapeHtml(
                            current.priority ||
                            "Medium"
                        )
                    }
                </b>

            </div>


            <div class="dl-ref-confidence">

                <span>
                    AI Confidence
                </span>

                <strong>
                    ${
                        confidence === null
                            ? "—"
                            : confidence + "%"
                    }
                </strong>


                <div>

                    <i
                        style="
                            width:${
                                confidence === null
                                    ? 0
                                    : Math.max(
                                        0,
                                        Math.min(
                                            100,
                                            confidence
                                        )
                                    )
                            }%
                        "
                    ></i>

                </div>

            </div>


            <div class="dl-ref-row">

                <span>
                    Created
                </span>

                <b>
                    ${
                        escapeHtml(
                            formatDate(
                                current.created_at
                            )
                        )
                    }
                </b>

            </div>


            <div class="dl-ref-row">

                <span>
                    Last Updated
                </span>

                <b>
                    ${
                        escapeHtml(
                            formatDate(
                                current.updated_at
                            )
                        )
                    }
                </b>

            </div>

        `;


        outcome.innerHTML = `

            <div
                class="dl-ref-outcome-status"
            >

                <span>
                    Status
                </span>

                <b>
                    ${
                        escapeHtml(
                            current.outcome_status ||
                            current.outcome ||
                            "Pending"
                        )
                    }
                </b>

            </div>


            <p>
                ${
                    escapeHtml(
                        current.outcome_result ||
                        "Record what happened after acting on this decision."
                    )
                }
            </p>

        `;

    }


    async function refreshRail(id) {

        if (
            !id ||
            typeof window.api !== "function"
        ) {
            return;
        }


        currentId = id;


        try {

            current =
                await window.api(
                    `/api/decisions/${encodeURIComponent(id)}`
                );


            renderRail();

        } catch (error) {

            console.warn(
                "DecisionLens rail refresh failed",
                error
            );

        }

    }


    function openOutcome() {

        document
            .querySelector(
                '[data-detail="outcome"]'
            )
            ?.click();

    }


    function wire() {

        $("dl-reference-open-outcome")
            ?.addEventListener(
                "click",
                openOutcome
            );


        $("dl-quick-add-outcome")
            ?.addEventListener(
                "click",
                openOutcome
            );


        $("dl-quick-rerun")
            ?.addEventListener(
                "click",
                () => {

                    document
                        .querySelector(
                            '[data-detail="agent"]'
                        )
                        ?.click();

                }
            );


        $("dl-quick-add-action")
            ?.addEventListener(
                "click",
                () => {

                    document
                        .querySelector(
                            '[data-detail="actions"]'
                        )
                        ?.click();

                }
            );


        $("dl-quick-share")
            ?.addEventListener(
                "click",
                async () => {

                    const title =
                        current?.title ||
                        "DecisionLens Decision";

                    const text =
                        `${title}\n\n${
                            current?.context || ""
                        }`;

                    try {

                        if (navigator.share) {

                            await navigator.share({
                                title,
                                text
                            });

                        } else {

                            await navigator
                                .clipboard
                                ?.writeText(
                                    text
                                );

                            alert(
                                "Decision copied to clipboard."
                            );

                        }

                    } catch (_) {

                        /* User cancelled sharing. */

                    }

                }
            );


        $("dl-quick-export")
            ?.addEventListener(
                "click",
                () => window.print()
            );


        /*
         * Refresh the reference rail immediately after
         * DecisionLens saves an updated decision.
         */
        window.addEventListener(
            "decisionlens:decision-updated",
            event => {

                const detail =
                    event.detail || {};

                const id =
                    detail.decisionId;

                const decision =
                    detail.decision;

                if (!id) {
                    return;
                }

                currentId = id;

                if (decision) {
                    current = decision;
                    renderRail();
                } else {
                    refreshRail(id);
                }

            }
        );


        document.addEventListener(
            "click",
            event => {

                const card =
                    event.target.closest(
                        "[data-decision-id]"
                    );


                if (
                    card
                    ?.dataset
                    ?.decisionId
                ) {

                    setTimeout(
                        () =>
                            refreshRail(
                                card
                                    .dataset
                                    .decisionId
                            ),
                        0
                    );

                }

            }
        );


        const list =
            $("decision-list");


        if (list) {

            new MutationObserver(
                () => {

                    const id =
                        activeDecisionId();

                    if (
                        id &&
                        id !== currentId
                    ) {

                        refreshRail(id);

                    }

                }
            )
                .observe(
                    list,
                    {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: [
                            "class"
                        ]
                    }
                );

        }


        setTimeout(
            () =>
                refreshRail(
                    activeDecisionId()
                ),
            800
        );

    }


    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            wire,
            {
                once: true
            }
        );

    } else {

        wire();

    }

})();
