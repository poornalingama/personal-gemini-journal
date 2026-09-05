(function () {
    "use strict";

    if (window.__decisionLensFeatureLoaded) return;
    window.__decisionLensFeatureLoaded = true;

    const state = {
        decisions: [],
        selectedId: null,
        tab: "decisions",
        detail: "workspace",
        busy: false,
    };

    const $ = id => document.getElementById(id);

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function parseAnalysis(raw) {
        // Support both the API/UI name and the Firestore field name.
        if (raw == null) return {};
        if (!raw) return {};
        if (typeof raw === "object") return raw;
        const text = String(raw).trim();
        try {
            return JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
        } catch (_) {
            return { summary: text };
        }
    }

    function selected() {
        return state.decisions.find(d => d.id === state.selectedId) || null;
    }

    function formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    }

    function listItem(decision) {
        const a = parseAnalysis(decision.analysis || decision.ai_analysis);
        const risk = a.risk_level || "Unrated";
        const active = decision.id === state.selectedId ? " active" : "";
        return `
            <button type="button" class="dl-decision-card${active}" data-decision-id="${escapeHtml(decision.id)}">
                <div class="dl-card-top">
                    <strong>${escapeHtml(decision.title || "Untitled Decision")}</strong>
                    <span>›</span>
                </div>
                <p>${escapeHtml((decision.context || "").slice(0, 105))}${(decision.context || "").length > 105 ? "…" : ""}</p>
                <div class="dl-badges">
                    <span class="dl-badge">In Progress</span>
                    <span class="dl-badge ${String(risk).toLowerCase().includes("high") ? "danger" : "safe"}">${escapeHtml(risk)} Risk</span>
                </div>
                <small>Updated ${escapeHtml(formatDate(decision.updated_at) || "recently")}</small>
            </button>`;
    }

    function renderList() {
        const list = $("decision-list");
        if (!list) return;
        const query = ($( "decision-search")?.value || "").toLowerCase().trim();
        const filtered = state.decisions.filter(d =>
            !query || `${d.title} ${d.context}`.toLowerCase().includes(query)
        );
        list.innerHTML = filtered.length
            ? filtered.map(listItem).join("")
            : `<div class="dl-empty-list">No decisions yet.<br>Click <strong>＋ New Decision</strong> to begin.</div>`;
        list.querySelectorAll("[data-decision-id]").forEach(btn => {
            btn.addEventListener("click", () => selectDecision(btn.dataset.decisionId));
        });
    }

    function renderAI() {

        const panel =
            $("decision-ai-content");

        const d =
            selected();

        if (!panel) return;

        if (!d) {

            panel.innerHTML = `
                <div class="dl-ai-placeholder">
                    Select a decision to see its recommendation,
                    risk, confidence and reasoning.
                </div>
            `;

            return;
        }

        const a =
            parseAnalysis(
                d.analysis ||
                d.ai_analysis ||
                {}
            );

        const recommendation =
            a.recommendation ||
            a.recommended_option ||
            a.best_option ||
            "Review the available information";

        const risk =
            a.risk_level ||
            "Not rated";

        const confidence =
            a.confidence ??
            a.ai_confidence ??
            a.confidence_score ??
            "—";

        const summary =
            a.summary ||
            a.overall_summary ||
            a.key_insight ||
            "Run Analyze with AI to generate a full decision assessment.";

        const keyFactors =
            Array.isArray(a.key_factors)
                ? a.key_factors
                : (
                    Array.isArray(a.key_insights)
                        ? a.key_insights
                        : []
                );

        const benefits =
            Array.isArray(a.benefits)
                ? a.benefits
                : [];

        const tradeoffs =
            Array.isArray(a.risks)
                ? a.risks
                : (
                    Array.isArray(a.tradeoffs)
                        ? a.tradeoffs
                        : []
                );

        const missing =
            Array.isArray(a.missing_information)
                ? a.missing_information
                : [];

        const alternatives =
            Array.isArray(a.alternatives)
                ? a.alternatives
                : [];

        const assumptions =
            Array.isArray(a.assumptions)
                ? a.assumptions
                : [];

        const actions =
            Array.isArray(d.actions)
                ? d.actions
                : (
                    Array.isArray(a.action_plan)
                        ? a.action_plan
                        : []
                );

        const renderList = items => {

            if (
                !Array.isArray(items) ||
                !items.length
            ) {

                return `
                    <p class="dl-intel-empty">
                        No items available yet.
                    </p>
                `;
            }

            return `
                <ul>
                    ${
                        items
                            .slice(0, 6)
                            .map(item => {

                                const value =
                                    typeof item === "string"
                                        ? item
                                        : (
                                            item.text ||
                                            item.action ||
                                            JSON.stringify(item)
                                        );

                                return `
                                    <li>
                                        ${escapeHtml(value)}
                                    </li>
                                `;
                            })
                            .join("")
                    }
                </ul>
            `;
        };

        const riskClass =
            String(risk)
                .toLowerCase()
                .includes("high")

                ? "high"

                : (
                    String(risk)
                        .toLowerCase()
                        .includes("low")

                        ? "low"
                        : "medium"
                );

        panel.innerHTML = `

            <section class="dl-intelligence-card">

                <div class="dl-intelligence-heading">

                    <div>

                        <span class="eyebrow">
                            DECISION INTELLIGENCE
                        </span>

                        <h3>
                            Agent Intelligence
                        </h3>

                    </div>

                    <span class="dl-agent-icon">
                        ✦
                    </span>

                </div>


                <div class="dl-intel-section">

                    <span class="dl-intel-label">
                        AI Recommendation
                    </span>

                    <div
                        class="dl-intel-recommendation"
                    >

                        <span
                            class="dl-intel-trophy"
                        >
                            🏆
                        </span>

                        <div>

                            <strong>
                                ${escapeHtml(recommendation)}
                            </strong>

                            <small>
                                AI assessment based on your
                                saved decision context
                            </small>

                        </div>

                        <span>›</span>

                    </div>

                </div>


                <div class="dl-intel-metrics">

                    <div>

                        <span>
                            Risk Level
                        </span>

                        <strong
                            class="${riskClass}"
                        >
                            ${escapeHtml(risk)}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Confidence
                        </span>

                        <strong>
                            ${
                                escapeHtml(
                                    String(confidence)
                                )
                            }
                            ${
                                String(confidence)
                                    .includes("%") ||
                                confidence === "—"
                                    ? ""
                                    : "%"
                            }
                        </strong>

                    </div>

                </div>


                <div class="dl-intel-summary">

                    <span class="dl-intel-label">
                        Summary
                    </span>

                    <p>
                        ${escapeHtml(summary)}
                    </p>

                </div>


                <div
                    class="dl-intel-accordions"
                >

                    <details open>

                        <summary>
                            ◫
                            <span>Key Factors</span>
                            <b>⌄</b>
                        </summary>

                        ${renderList(keyFactors)}

                    </details>


                    <details>

                        <summary>
                            ◉
                            <span>Benefits</span>
                            <b>⌄</b>
                        </summary>

                        ${renderList(benefits)}

                    </details>


                    <details>

                        <summary>
                            △
                            <span>Risks / Trade-offs</span>
                            <b>⌄</b>
                        </summary>

                        ${renderList(tradeoffs)}

                    </details>


                    <details>

                        <summary>
                            ⓘ
                            <span>Missing Information</span>
                            <b>⌄</b>
                        </summary>

                        ${renderList(missing)}

                    </details>


                    <details>

                        <summary>
                            ◇
                            <span>Alternatives Considered</span>
                            <b>⌄</b>
                        </summary>

                        ${renderList(alternatives)}

                    </details>


                    <details>

                        <summary>
                            ◌
                            <span>Assumptions</span>
                            <b>⌄</b>
                        </summary>

                        ${renderList(assumptions)}

                    </details>


                    <details>

                        <summary>
                            ↗
                            <span>Action Plan</span>
                            <b>⌄</b>
                        </summary>

                        ${renderList(actions)}

                    </details>

                </div>


                <button
                    type="button"
                    class="ghost-button dl-intel-compare"
                    id="dl-intel-compare"
                >
                    Compare with Another Decision
                </button>

            </section>
        `;

        $("dl-intel-compare")
            ?.addEventListener(
                "click",
                () => {

                    state.tab =
                        "compare";

                    document
                        .querySelector(
                            '[data-dl-tab="compare"]'
                        )
                        ?.click();
                }
            );
    }


    function renderDetail() {
        const host = $("dl-detail-content");
        const d = selected();

        if (!host) return;

        if (!d) {
            host.innerHTML =
                `<div class="dl-empty">Create or select a decision to begin.</div>`;
            return;
        }

        const a = parseAnalysis(
            d.analysis || d.ai_analysis
        );

        /*
         * ============================================================
         * AI ANALYSIS
         * ============================================================
         */
        if (state.detail === "analysis") {

            host.innerHTML = `
                <div class="dl-detail-grid">

                    <div class="dl-detail-card">
                        <h4>Recommendation</h4>
                        <strong>
                            ${escapeHtml(a.recommendation || "—")}
                        </strong>
                    </div>

                    <div class="dl-detail-card">
                        <h4>Confidence</h4>
                        <strong>
                            ${
                                Number.isFinite(Number(a.confidence))
                                    ? Number(a.confidence) + "%"
                                    : "—"
                            }
                        </strong>
                    </div>

                    <div class="dl-detail-card">
                        <h4>Risk</h4>
                        <strong>
                            ${escapeHtml(a.risk_level || "—")}
                        </strong>
                    </div>

                    <div class="dl-detail-card wide">
                        <h4>Summary</h4>
                        <p>
                            ${escapeHtml(a.summary || "—")}
                        </p>
                    </div>

                </div>
            `;

        /*
         * ============================================================
         * AGENT INSIGHTS
         * ============================================================
         */
        } else if (state.detail === "agent") {

            const agent =
                parseAnalysis(
                    d.agent_analysis
                );

            const missing =
                agent.missing_information?.length
                    ? agent.missing_information
                    : a.missing_information || [];

            const confirmed =
                Array.isArray(
                    d.agent_confirmed_items
                )
                    ? d.agent_confirmed_items
                    : [];

            const confirmedSet =
                new Set(confirmed);

            const confirmedCount =
                missing.filter(
                    item => confirmedSet.has(item)
                ).length;

            const allConfirmed =
                missing.length > 0 &&
                confirmedCount === missing.length;

            host.innerHTML = `
                <div class="dl-agent-card">

                    <div class="dl-agent-card-head">

                        <div>
                            <h4>Agent Insights</h4>

                            <p>
                                Review and confirm the information
                                gaps identified by Decision Agent.
                            </p>
                        </div>

                        <span class="dl-status-badge ${
                            allConfirmed ? "success" : ""
                        }">

                            ${
                                missing.length
                                    ? `${confirmedCount}/${missing.length} confirmed`
                                    : "No gaps"
                            }

                        </span>

                    </div>

                    ${
                        missing.length
                            ? `
                                <div class="dl-agent-items">

                                    ${missing.map((item, i) => {

                                        const isConfirmed =
                                            confirmedSet.has(item);

                                        return `
                                            <div
                                                class="dl-agent-item ${
                                                    isConfirmed
                                                        ? "confirmed"
                                                        : ""
                                                }"
                                                data-agent-item="${i}">

                                                <button
                                                    type="button"
                                                    class="dl-agent-item-main"
                                                    data-agent-review="${i}">

                                                    <span
                                                        class="dl-agent-item-icon">
                                                        ${
                                                            isConfirmed
                                                                ? "✓"
                                                                : "?"
                                                        }
                                                    </span>

                                                    <span
                                                        class="dl-agent-item-body">

                                                        <strong>
                                                            ${escapeHtml(item)}
                                                        </strong>

                                                        <small>
                                                            ${
                                                                isConfirmed
                                                                    ? "Confirmed"
                                                                    : "Select to review"
                                                            }
                                                        </small>

                                                    </span>


                                                </button>

                                                <button
                                                    type="button"
                                                    class="ghost-button dl-agent-confirm-item ${
                                                        isConfirmed
                                                            ? "confirmed"
                                                            : ""
                                                    }"
                                                    data-confirm-index="${i}"
                                                    title="${
                                                        isConfirmed
                                                            ? "Remove confirmation"
                                                            : "Confirm this information"
                                                    }"
                                                    aria-label="${
                                                        isConfirmed
                                                            ? "Remove confirmation"
                                                            : "Confirm this information"
                                                    }">

                                                    ${
                                                        isConfirmed
                                                            ? "Confirmed"
                                                            : "Confirm"
                                                    }

                                                </button>

                                            </div>
                                        `;
                                    }).join("")}

                                </div>
                            `
                            : `
                                <div class="dl-agent-empty">
                                    No information gaps were identified.
                                </div>
                            `
                    }

                    <div
                        id="agent-focus"
                        class="dl-agent-focus"
                        hidden>
                    </div>

                    <div class="dl-agent-confirm-area">

                        <button
                            type="button"
                            class="primary-button dl-compact-primary"
                            id="agent-confirm"
                            title="Re-run Agent Analysis"
                            aria-label="Re-run Agent Analysis">

                            <span aria-hidden="true">✦</span>
                            <span>Re-run</span>

                        </button>

                        <small>
                            Re-run the Decision Agent using the
                            information currently saved to this decision.
                        </small>

                    </div>

                </div>
            `;

            /*
             * Review an individual information gap.
             */
            host
                .querySelectorAll("[data-agent-review]")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();
                            event.stopPropagation();

                            const index =
                                Number(
                                    button.dataset.agentReview
                                );

                            const item =
                                missing[index];

                            if (!item) return;

                            host
                                .querySelectorAll(
                                    ".dl-agent-item"
                                )
                                .forEach(x =>
                                    x.classList.remove("selected")
                                );

                            button
                                .closest(".dl-agent-item")
                                ?.classList.add("selected");

                            const focus =
                                $("agent-focus");

                            if (!focus) return;

                            focus.hidden = false;

                            focus.innerHTML = `
                                <div class="dl-agent-focus-inner">

                                    <div class="dl-agent-focus-title">

                                        <span
                                            class="dl-agent-item-icon">
                                            ?
                                        </span>

                                        <strong>
                                            Information to clarify
                                        </strong>

                                    </div>

                                    <p
                                        class="dl-agent-focus-question">
                                        ${escapeHtml(item)}
                                    </p>

                                    <small>
                                        Review this information and
                                        explicitly confirm it when
                                        you are satisfied.
                                    </small>

                                </div>
                            `;

                            requestAnimationFrame(() => {
                                focus.scrollIntoView({
                                    behavior: "smooth",
                                    block: "nearest"
                                });
                            });
                        }
                    );
                });

            /*
             * Confirm / unconfirm individual information.
             */
            host
                .querySelectorAll(
                    ".dl-agent-confirm-item"
                )
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        async event => {

                            event.preventDefault();
                            event.stopPropagation();

                            const index =
                                Number(
                                    button.dataset.confirmIndex
                                );

                            const item =
                                missing[index];

                            if (!item || !d.id) return;

                            const next =
                                confirmedSet.has(item)
                                    ? confirmed.filter(
                                        x => x !== item
                                    )
                                    : [
                                        ...confirmed,
                                        item
                                    ];

                            button.disabled = true;

                            try {

                                const response =
                                    await window.api(
                                        `/api/decisions/${encodeURIComponent(d.id)}/agent-confirmations`,
                                        {
                                            method: "PUT",
                                            body: JSON.stringify({
                                                confirmations: next
                                            })
                                        }
                                    );

                                const saved =
                                    response.confirmations || next;

                                state.decisions =
                                    state.decisions.map(
                                        decision =>
                                            decision.id === d.id
                                                ? {
                                                    ...decision,
                                                    agent_confirmed_items:
                                                        saved,
                                                    agent_confirmed_at:
                                                        saved.length
                                                            ? new Date().toISOString()
                                                            : null,
                                                    updated_at:
                                                        new Date().toISOString()
                                                }
                                                : decision
                                    );

                                renderDetail();
                                renderTimeline();

                            } catch (error) {

                                button.disabled = false;

                                alert(
                                    error?.message ||
                                    "Unable to save Agent Insight confirmation."
                                );
                            }
                        }
                    );
                });

            /*
             * Re-run Agent Analysis.
             */
            $("agent-confirm")?.addEventListener(
                "click",
                async () => {

                    if (
                        !d.id ||
                        typeof window.api !== "function"
                    ) {
                        return;
                    }

                    const button =
                        $("agent-confirm");

                    button.disabled = true;

                    button.innerHTML = `
                        <span class="dl-button-spinner"
                              aria-hidden="true"></span>
                        <span>Running...</span>
                    `;

                    try {

                        const response =
                            await window.api(
                                `/api/decisions/${encodeURIComponent(d.id)}/agent`,
                                {
                                    method: "POST"
                                }
                            );

                        const updated =
                            await window.api(
                                `/api/decisions/${encodeURIComponent(d.id)}`
                            );

                        const next =
                            updated || {
                                ...d,
                                agent_analysis:
                                    response.analysis
                            };

                        state.decisions =
                            state.decisions.map(
                                item =>
                                    item.id === d.id
                                        ? next
                                        : item
                            );

                        renderAll();

                    } catch (error) {

                        button.disabled = false;

                        button.innerHTML = `
                            <span aria-hidden="true">✦</span>
                            <span>Re-run</span>
                        `;

                        alert(
                            error?.message ||
                            "Unable to run Agent Analysis."
                        );
                    }
                }
            );

        /*
         * ============================================================
         * ACTIONS
         * ============================================================
         */
        } else if (state.detail === "actions") {

            const actions =
                Array.isArray(d.actions)
                    ? d.actions
                    : (
                        Array.isArray(a.action_plan)
                            ? a.action_plan
                            : []
                    );

            async function persistActions(nextActions) {

                if (
                    !d.id ||
                    typeof window.api !== "function"
                ) {
                    return;
                }

                const response =
                    await window.api(
                        `/api/decisions/${encodeURIComponent(d.id)}/actions`,
                        {
                            method: "PUT",
                            body: JSON.stringify({
                                actions: nextActions
                            })
                        }
                    );

                const savedActions =
                    response.actions || nextActions;

                state.decisions =
                    state.decisions.map(item =>
                        item.id === d.id
                            ? {
                                ...item,
                                actions: savedActions,
                                updated_at:
                                    new Date().toISOString()
                            }
                            : item
                    );

                renderDetail();
                renderTimeline();
            }

            host.innerHTML = `
                <div class="dl-actions-card">

                    <div class="dl-actions-head">

                        <div>
                            <h4>Action Plan</h4>
                            <p>
                                Add, edit, complete, or remove
                                concrete next steps.
                            </p>
                        </div>

                        <button
                            type="button"
                            class="primary-button dl-compact-primary dl-icon-action"
                            id="action-add"
                            title="Add action"
                            aria-label="Add action">

                            <span aria-hidden="true">＋</span>
                            <span class="dl-button-label">Add</span>

                        </button>

                    </div>

                    <div class="dl-actions-list">

                        ${
                            actions.length
                                ? actions.map((item, i) => {

                                    const actionText =
                                        typeof item === "object"
                                            ? item.text || item.action || ""
                                            : String(item);

                                    const completed =
                                        typeof item === "object"
                                            ? !!item.completed
                                            : false;

                                    return `
                                        <div
                                            class="dl-action-row ${
                                                completed
                                                    ? "completed"
                                                    : ""
                                            }">

                                            <input
                                                type="checkbox"
                                                class="dl-action-check"
                                                data-action-index="${i}"
                                                ${completed ? "checked" : ""}
                                                title="Mark action complete"
                                                aria-label="Mark action complete">

                                            <span class="dl-action-number">
                                                ${i + 1}
                                            </span>

                                            <span class="dl-action-text">
                                                ${escapeHtml(actionText)}
                                            </span>

                                            <div class="dl-action-controls">

                                                <button
                                                    type="button"
                                                    class="ghost-button dl-action-edit"
                                                    data-action-index="${i}"
                                                    title="Edit action"
                                                    aria-label="Edit action">

                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        aria-hidden="true">
                                                        <path d="M12 20h9"></path>
                                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                                                    </svg>

                                                </button>

                                                <button
                                                    type="button"
                                                    class="ghost-button danger-button dl-action-delete"
                                                    data-action-index="${i}"
                                                    title="Delete action"
                                                    aria-label="Delete action">

                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        aria-hidden="true">
                                                        <path d="M3 6h18"></path>
                                                        <path d="M8 6V4h8v2"></path>
                                                        <path d="M19 6l-1 14H6L5 6"></path>
                                                        <path d="M10 11v5"></path>
                                                        <path d="M14 11v5"></path>
                                                    </svg>

                                                </button>

                                            </div>

                                        </div>
                                    `;
                                }).join("")
                                : `
                                    <div class="dl-no-actions">
                                        <p>No actions yet.</p>

                                        <button
                                            type="button"
                                            class="primary-button"
                                            id="action-add-empty">

                                            + Add First Action

                                        </button>
                                    </div>
                                `
                        }

                    </div>

                    <div
                        id="action-editor"
                        class="dl-action-editor"
                        hidden>
                    </div>

                </div>
            `;

            function openActionEditor(index = null) {

                const editor =
                    $("action-editor");

                if (!editor) return;

                const existing =
                    index !== null
                        ? actions[index]
                        : null;

                const value =
                    typeof existing === "object"
                        ? existing.text || existing.action || ""
                        : existing || "";

                editor.hidden = false;

                editor.innerHTML = `
                    <div class="dl-action-editor-inner">

                        <strong>
                            ${
                                index === null
                                    ? "Add Action"
                                    : "Edit Action"
                            }
                        </strong>

                        <textarea
                            id="action-editor-input"
                            rows="3"
                            placeholder="Enter the action...">${escapeHtml(value)}</textarea>

                        <div class="dl-action-editor-buttons">

                            <button
                                type="button"
                                class="primary-button"
                                id="action-editor-save">

                                ${
                                    index === null
                                        ? "Add Action"
                                        : "Save Changes"
                                }

                            </button>

                            <button
                                type="button"
                                class="ghost-button"
                                id="action-editor-cancel">

                                Cancel

                            </button>

                        </div>

                    </div>
                `;

                $("action-editor-input")?.focus();

                $("action-editor-cancel")?.addEventListener(
                    "click",
                    () => {
                        editor.hidden = true;
                    }
                );

                $("action-editor-save")?.addEventListener(
                    "click",
                    async () => {

                        const input =
                            $("action-editor-input");

                        const value =
                            input?.value.trim();

                        if (!value) {
                            input?.focus();
                            return;
                        }

                        const nextActions =
                            actions.map(item => {

                                if (
                                    typeof item === "object"
                                ) {
                                    return {
                                        ...item
                                    };
                                }

                                return {
                                    text: String(item),
                                    completed: false
                                };
                            });

                        if (index === null) {

                            nextActions.push({
                                text: value,
                                completed: false
                            });

                        } else {

                            nextActions[index] = {
                                ...nextActions[index],
                                text: value
                            };
                        }

                        const saveButton =
                            $("action-editor-save");

                        saveButton.disabled = true;
                        saveButton.textContent =
                            "Saving...";

                        try {

                            await persistActions(
                                nextActions
                            );

                        } catch (error) {

                            saveButton.disabled = false;
                            saveButton.textContent =
                                index === null
                                    ? "Add Action"
                                    : "Save Changes";

                            alert(
                                error?.message ||
                                "Unable to save action."
                            );
                        }
                    }
                );
            }

            $("action-add")?.addEventListener(
                "click",
                () => openActionEditor()
            );

            $("action-add-empty")?.addEventListener(
                "click",
                () => openActionEditor()
            );

            host
                .querySelectorAll(".dl-action-edit")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () => {
                            openActionEditor(
                                Number(
                                    button.dataset.actionIndex
                                )
                            );
                        }
                    );
                });

            host
                .querySelectorAll(".dl-action-delete")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        async () => {

                            const index =
                                Number(
                                    button.dataset.actionIndex
                                );

                            if (
                                !Number.isInteger(index) ||
                                !actions[index]
                            ) {
                                return;
                            }

                            if (
                                !confirm(
                                    "Delete this action?"
                                )
                            ) {
                                return;
                            }

                            const nextActions =
                                actions.filter(
                                    (_, i) => i !== index
                                );

                            try {

                                await persistActions(
                                    nextActions
                                );

                            } catch (error) {

                                alert(
                                    error?.message ||
                                    "Unable to delete action."
                                );
                            }
                        }
                    );
                });

            host
                .querySelectorAll(".dl-action-check")
                .forEach(input => {

                    input.addEventListener(
                        "change",
                        async () => {

                            const index =
                                Number(
                                    input.dataset.actionIndex
                                );

                            if (
                                !Number.isInteger(index) ||
                                !actions[index]
                            ) {
                                return;
                            }

                            const nextActions =
                                actions.map((item, i) => {

                                    const base =
                                        typeof item === "object"
                                            ? {
                                                ...item
                                            }
                                            : {
                                                text: String(item),
                                                completed: false
                                            };

                                    if (i === index) {
                                        base.completed =
                                            input.checked;
                                    }

                                    return base;
                                });

                            try {

                                await persistActions(
                                    nextActions
                                );

                            } catch (error) {

                                input.checked =
                                    !input.checked;

                                alert(
                                    error?.message ||
                                    "Unable to update action."
                                );
                            }
                        }
                    );
                });

        /*
         * ============================================================
         * OUTCOME
         * ============================================================
         */
        } else if (state.detail === "outcome") {

            const outcomeStatus =
                d.outcome_status ||
                d.outcome ||
                "";

            const outcomeResult =
                d.outcome_result ||
                "";

            host.innerHTML = `
                <div class="dl-outcome-card">

                    <div class="dl-outcome-head">

                        <div>
                            <h4>Outcome</h4>
                            <p>
                                Record what actually happened after
                                making this decision.
                            </p>
                        </div>

                        ${
                            outcomeStatus
                                ? `
                                    <span class="dl-status-badge success">
                                        Recorded
                                    </span>
                                `
                                : `
                                    <span class="dl-status-badge">
                                        Pending
                                    </span>
                                `
                        }

                    </div>

                    <label class="dl-field">

                        <span>Outcome Status</span>

                        <select id="decision-outcome-status">

                            <option value="">
                                Select outcome
                            </option>

                            <option
                                value="Successful"
                                ${
                                    outcomeStatus === "Successful"
                                        ? "selected"
                                        : ""
                                }>
                                Successful
                            </option>

                            <option
                                value="Partially Successful"
                                ${
                                    outcomeStatus === "Partially Successful"
                                        ? "selected"
                                        : ""
                                }>
                                Partially Successful
                            </option>

                            <option
                                value="Unsuccessful"
                                ${
                                    outcomeStatus === "Unsuccessful"
                                        ? "selected"
                                        : ""
                                }>
                                Unsuccessful
                            </option>

                            <option
                                value="Still Evaluating"
                                ${
                                    outcomeStatus === "Still Evaluating"
                                        ? "selected"
                                        : ""
                                }>
                                Still Evaluating
                            </option>

                        </select>

                    </label>

                    <label class="dl-field">

                        <span>What happened?</span>

                        <textarea
                            id="decision-outcome-result"
                            rows="6"
                            placeholder="Describe the actual result, what went differently, and what you learned...">${escapeHtml(outcomeResult)}</textarea>

                    </label>

                    <div class="dl-outcome-actions">

                        <button
                            type="button"
                            class="primary-button dl-compact-primary dl-save-icon-button"
                            id="decision-outcome-save"
                            title="${
                                outcomeStatus
                                    ? "Update outcome"
                                    : "Save outcome"
                            }"
                            aria-label="${
                                outcomeStatus
                                    ? "Update outcome"
                                    : "Save outcome"
                            }">

                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path>
                                <path d="M17 21v-8H7v8"></path>
                                <path d="M7 3v5h8"></path>
                            </svg>

                            <span class="dl-button-label">
                                ${
                                    outcomeStatus
                                        ? "Update"
                                        : "Save"
                                }
                            </span>

                        </button>

                    </div>

                </div>
            `;

            /*
             * Reference-style Outcome Summary UX.
             *
             * Existing backend fields are preserved:
             * - outcome = status/result state
             * - result = written summary
             */
            const outcomeCard =
                host.querySelector(
                    ".dl-outcome-card"
                );

            if (outcomeCard) {

                const heading =
                    outcomeCard.querySelector("h4");

                if (heading) {
                    heading.textContent =
                        "Outcome Summary";
                }

                const labels =
                    outcomeCard.querySelectorAll(
                        ".dl-field > span"
                    );

                if (labels[0]) {
                    labels[0].textContent =
                        "Status";
                }

                if (labels[1]) {
                    labels[1].textContent =
                        "Summary";
                }

                const textarea =
                    $("decision-outcome-result");

                if (textarea) {
                    textarea.placeholder =
                        "What happened? Result, wins, lessons...";
                }

                if (
                    !outcomeCard.querySelector(
                        ".dl-result-selector"
                    )
                ) {

                    const selector =
                        document.createElement(
                            "div"
                        );

                    selector.className =
                        "dl-result-selector";

                    selector.innerHTML = `
                        <span class="dl-result-label">
                            Result
                        </span>

                        <div class="dl-result-options">

                            <button
                                type="button"
                                data-outcome-result="Successful">
                                Positive
                            </button>

                            <button
                                type="button"
                                data-outcome-result="Partially Successful">
                                Neutral
                            </button>

                            <button
                                type="button"
                                data-outcome-result="Unsuccessful">
                                Negative
                            </button>

                        </div>
                    `;

                    const actions =
                        outcomeCard.querySelector(
                            ".dl-outcome-actions"
                        );

                    if (actions) {
                        outcomeCard.insertBefore(
                            selector,
                            actions
                        );
                    } else {
                        outcomeCard.appendChild(
                            selector
                        );
                    }

                    const select =
                        $("decision-outcome-status");

                    selector
                        .querySelectorAll(
                            "[data-outcome-result]"
                        )
                        .forEach(button => {

                            if (
                                select &&
                                button.dataset
                                    .outcomeResult ===
                                    select.value
                            ) {
                                button.classList.add(
                                    "active"
                                );
                            }

                            button.addEventListener(
                                "click",
                                () => {

                                    if (select) {
                                        select.value =
                                            button.dataset
                                                .outcomeResult;
                                    }

                                    selector
                                        .querySelectorAll(
                                            "[data-outcome-result]"
                                        )
                                        .forEach(
                                            item =>
                                                item.classList
                                                    .toggle(
                                                        "active",
                                                        item === button
                                                    )
                                        );
                                }
                            );
                        });
                }
            }

            $("decision-outcome-save")?.addEventListener(
                "click",
                async () => {

                    const status =
                        $("decision-outcome-status")
                            ?.value
                            .trim();

                    const result =
                        $("decision-outcome-result")
                            ?.value
                            .trim();

                    if (!status) {

                        $("decision-outcome-status")
                            ?.focus();

                        return;
                    }

                    if (!d.id) return;

                    const button =
                        $("decision-outcome-save");

                    button.disabled = true;
                    button.innerHTML = `
                        <span class="dl-button-spinner" aria-hidden="true"></span>
                        <span class="dl-button-label">Saving...</span>
                    `;

                    try {

                        await window.api(
                            `/api/decisions/${encodeURIComponent(d.id)}/outcome`,
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    outcome: status,
                                    result
                                })
                            }
                        );

                        const updated =
                            await window.api(
                                `/api/decisions/${encodeURIComponent(d.id)}`
                            );

                        state.decisions =
                            state.decisions.map(item =>
                                item.id === d.id
                                    ? updated
                                    : item
                            );

                        renderAll();

                        window.dispatchEvent(
                            new CustomEvent(
                                "decisionlens:decision-updated",
                                {
                                    detail: {
                                        decisionId: d.id,
                                        decision: updated
                                    }
                                }
                            )
                        );

                    } catch (error) {

                        button.disabled = false;
                        button.textContent =
                            outcomeStatus
                                ? "Update Outcome"
                                : "Save Outcome";

                        alert(
                            error?.message ||
                            "Unable to save outcome."
                        );
                    }
                }
            );

        /*
         * ============================================================
         * DEFAULT DECISION VIEW
         * ============================================================
         */
        } else {

            host.innerHTML = `
                <div class="dl-workspace-grid">

                    <div class="dl-detail-card">
                        <h4>Decision Question</h4>
                        <p>
                            ${escapeHtml(d.title)}
                        </p>
                    </div>

                    <div class="dl-detail-card">
                        <h4>Context & Background</h4>
                        <p>
                            ${escapeHtml(
                                d.context ||
                                "No context provided."
                            )}
                        </p>
                    </div>

                    <div class="dl-detail-card wide">

                        <h4>Options</h4>

                        ${
                            (
                                Array.isArray(d.options) &&
                                d.options.filter(Boolean).length
                                    ? d.options.filter(Boolean)
                                    : (a.alternatives || [])
                            )
                                .map(
                                    (x, i) => `
                                        <div class="dl-option">
                                            <b>${i + 1}</b>
                                            <span>
                                                ${escapeHtml(x)}
                                            </span>
                                        </div>
                                    `
                                )
                                .join("")
                            ||
                            "<p>No options added yet.</p>"
                        }

                    </div>

                </div>
            `;
        }
    }

    function renderTimeline() {

        const host = $("decision-timeline");
        const d = selected();

        if (!host) return;


        /*
         * TRACKER POSITION
         *
         * Keep the live tracker directly AFTER the
         * Decision Intelligence workspace content.
         *
         * Desired order:
         *
         * Decision Intelligence
         * → tabs
         * → decision content
         * → options
         * → live tracker
         */
        const panel =
            host.closest(
                ".dl-timeline-panel"
            );

        const detailContent =
            $("dl-detail-content");

        if (
            panel &&
            detailContent &&
            panel.previousElementSibling !==
                detailContent
        ) {
            detailContent.insertAdjacentElement(
                "afterend",
                panel
            );
        }

        /*
         * Keep the canonical live tracker in its HTML position.
         *
         * Do not move the panel outside the center editor/workspace.
         * The tracker is rendered in #decision-timeline below Context &
         * Background, and only its live content is updated here.
         */

        if (!d) {

            host.innerHTML = `
                <div class="dl-timeline-empty">
                    Select or create a decision to view its progress.
                </div>
            `;

            return;
        }


        /*
         * Normalize persisted confirmation text.
         *
         * This prevents whitespace/case differences from causing
         * a confirmed item to appear as unconfirmed.
         */
        const normalize = value =>
            String(value ?? "")
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();


        /*
         * AI ANALYSIS
         */
        const analysis =
            parseAnalysis(
                d.analysis ||
                d.ai_analysis
            );


        /*
         * AGENT ANALYSIS
         */
        const agent =
            parseAnalysis(
                d.agent_analysis
            );


        const agentMissing =
            Array.isArray(
                agent.missing_information
            )
                ? agent.missing_information
                : [];


        const analysisMissing =
            Array.isArray(
                analysis.missing_information
            )
                ? analysis.missing_information
                : [];


        /*
         * Prefer the Agent's own information gaps.
         * Fall back to AI analysis gaps when necessary.
         */
        const missing =
            agentMissing.length
                ? agentMissing
                : analysisMissing;


        /*
         * Persisted Agent confirmations.
         */
        const confirmed =
            Array.isArray(
                d.agent_confirmed_items
            )
                ? d.agent_confirmed_items
                : [];


        const confirmedSet =
            new Set(
                confirmed
                    .map(normalize)
                    .filter(Boolean)
            );


        const confirmedCount =
            missing.filter(
                item =>
                    confirmedSet.has(
                        normalize(item)
                    )
            ).length;


        const hasAnalysis =
            !!(
                d.analysis ||
                d.ai_analysis ||
                d.ai_analyzed_at
            );


        const hasAgentRun =
            !!(
                d.agent_analysis ||
                d.agent_analyzed_at
            );


        /*
         * Agent Insights are complete when:
         *
         * 1. All information gaps are confirmed, OR
         * 2. The Agent completed and there were no gaps.
         */
        const hasAgentInsights =
            missing.length > 0
                ? (
                    confirmedCount >=
                    missing.length
                )
                : hasAgentRun;


        /*
         * ACTIONS
         */
        const actions =
            Array.isArray(d.actions)
                ? d.actions
                : (
                    Array.isArray(
                        analysis.action_plan
                    )
                        ? analysis.action_plan
                        : []
                );


        const completedActions =
            actions.filter(
                item =>
                    typeof item === "object" &&
                    item.completed === true
            ).length;


        const hasActions =
            actions.length > 0;


        /*
         * Actions are only complete when EVERY action
         * has actually been completed.
         */
        const actionsComplete =
            hasActions &&
            completedActions >=
                actions.length;


        /*
         * OUTCOME
         *
         * Support both the old and current backend field names.
         */
        const outcomeStatus =
            String(
                d.outcome_status ||
                d.outcome ||
                ""
            ).trim();


        const hasOutcome =
            !!(
                outcomeStatus ||
                String(
                    d.outcome_result || ""
                ).trim() ||
                d.outcome_recorded_at
            );


        /*
         * Determine the current active stage.
         */
        let activeIndex = 0;

        if (hasAnalysis) {
            activeIndex = 1;
        }

        if (hasAgentInsights) {
            activeIndex = 2;
        }

        if (
            hasActions &&
            !actionsComplete
        ) {
            activeIndex = 3;
        } else if (actionsComplete) {
            activeIndex = 4;
        }

        if (hasOutcome) {
            activeIndex = 4;
        }


        const steps = [

            {
                title: "Created",

                detail:
                    d.created_at
                        ? formatDate(
                            d.created_at
                        )
                        : "Decision created",

                complete: true
            },

            {
                title: "AI Analysis",

                detail:
                    hasAnalysis
                        ? "Complete"
                        : "Waiting for analysis",

                complete:
                    hasAnalysis
            },

            {
                title: "Agent Insights",

                detail:
                    missing.length
                        ? `${confirmedCount}/${missing.length} confirmed`
                        : (
                            hasAgentInsights
                                ? "Complete"
                                : "Pending"
                        ),

                complete:
                    hasAgentInsights
            },

            {
                title: "Actions",

                detail:
                    hasActions
                        ? `${completedActions}/${actions.length} complete`
                        : "No actions yet",

                complete:
                    actionsComplete
            },

            {
                title: "Outcome",

                detail:
                    hasOutcome
                        ? "Recorded"
                        : "Pending",

                complete:
                    hasOutcome
            }

        ];


        host.innerHTML = `

            <div class="dl-timeline-track">

                ${steps.map(
                    (step, index) => {

                        const isActive =
                            index === activeIndex;


                        const state =
                            step.complete
                                ? "complete"
                                : (
                                    isActive
                                        ? "active"
                                        : "pending"
                                );


                        const icon =
                            step.complete
                                ? "✓"
                                : (
                                    isActive
                                        ? "●"
                                        : "○"
                                );


                        return `

                            <div
                                class="
                                    dl-timeline-step
                                    ${state}
                                "
                            >

                                <div
                                    class="dl-timeline-node"
                                >
                                    ${icon}
                                </div>


                                <div
                                    class="dl-timeline-content"
                                >

                                    <strong>
                                        ${escapeHtml(
                                            step.title
                                        )}
                                    </strong>


                                    <span>
                                        ${escapeHtml(
                                            step.detail
                                        )}
                                    </span>

                                </div>

                            </div>

                        `;

                    }
                ).join("")}

            </div>

        `;
    }

    function fillForm(d) {
        $("decision-title").value = d?.title || "";
        $("decision-context").value = d?.context || "";

        const savedOptions =
            Array.isArray(d?.options)
                ? d.options
                : [];

        $("decision-option-1").value =
            savedOptions[0] || "";

        $("decision-option-2").value =
            savedOptions[1] || "";

        $("decision-active-title").textContent =
            d?.title || "New Decision";

        $("decision-status").textContent =
            d ? "In Progress" : "Draft";

        const created =
            $("decision-created");

        const updated =
            $("decision-updated");

        const separator =
            document.querySelector(
                "#decisionlens .dl-date-separator"
            );

        if (!d) {

            if (created) {
                created.textContent = "";
            }

            if (updated) {
                updated.textContent = "";
            }

            if (separator) {
                separator.style.display = "none";
            }

            return;
        }

        const createdValue =
            d.created_at ||
            d.createdAt ||
            d.created ||
            null;

        const updatedValue =
            d.updated_at ||
            d.updatedAt ||
            d.last_updated ||
            d.created_at ||
            null;

        if (created) {

            const formatted =
                formatDate(createdValue);

            created.textContent =
                formatted
                    ? `Created: ${formatted}`
                    : "";
        }

        if (updated) {

            const formatted =
                formatDate(updatedValue);

            updated.textContent =
                formatted
                    ? `Updated: ${formatted}`
                    : "";
        }

        if (separator) {

            separator.style.display =
                (
                    created?.textContent &&
                    updated?.textContent
                )
                    ? ""
                    : "none";
        }
    }




    function applyDecisionLensWorkspaceUX() {
        const workspace =
            $("dl-workspace") ||
            document.querySelector(".dl-workspace");

        if (!workspace) return;

        /*
         * Hide detail navigation when a secondary tool is open.
         * Decision Comparer / History / Tracker / Agent should
         * not display Workspace / Analysis / Agent / Actions /
         * Outcome controls.
         */
        const isSecondary =
            state.tab &&
            state.tab !== "decisions";

        document.querySelectorAll(
            ".dl-detail-tabs"
        ).forEach(node => {
            node.style.display =
                isSecondary ? "none" : "";
        });

        /*
         * Ensure the main decision page has the New Decision action.
         */
        if (!isSecondary) {
            const library =
                document.querySelector(".dl-library");

            if (
                library &&
                !library.querySelector(
                    "#decision-new, [data-dl-new-decision]"
                )
            ) {
                const button =
                    document.createElement("button");

                button.type = "button";
                button.className =
                    "primary-button dl-new-decision";

                button.dataset.dlNewDecision =
                    "true";

                button.textContent =
                    "＋ New Decision";

                button.addEventListener(
                    "click",
                    () => {
                        $("decision-title")?.focus();

                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });
                    }
                );

                library.insertBefore(
                    button,
                    library.firstChild
                );
            }
        }

        /*
         * Align the existing hero action buttons.
         */
        document.querySelectorAll(
            ".dl-hero-actions"
        ).forEach(actions => {

            actions.classList.add(
                "dl-actions-reference"
            );

            Array.from(
                actions.querySelectorAll("button")
            ).forEach(button => {

                const text =
                    button.textContent
                        .replace(/\s+/g, " ")
                        .trim()
                        .toLowerCase();

                if (text.includes("edit")) {
                    button.classList.add(
                        "dl-action-edit"
                    );
                }

                if (
                    text.includes("analyze") ||
                    text.includes("analyse")
                ) {
                    button.classList.add(
                        "dl-action-analyze"
                    );
                }

                if (text.includes("delete")) {
                    button.classList.add(
                        "dl-action-delete"
                    );
                }
            });
        });

        /*
         * Convert the EXISTING right-side AI area into the
         * reference Agent Intelligence rail.
         */
        const aiPanel =
            document.querySelector(".dl-ai-panel");

        if (aiPanel) {
            aiPanel.classList.add(
                "dl-reference-rail"
            );

            let content =
                $("decision-ai-content");

            if (!content) {
                content =
                    document.createElement("div");

                content.id =
                    "decision-ai-content";

                aiPanel.appendChild(content);
            }

            renderAI();
        }
    }





    function renderAll() {
        renderList();
        renderAI();
        renderDetail();
        renderTimeline();

        const d = selected();
        const preview = $("decision-context-preview");

        if (preview) {
            preview.textContent =
                d?.context ||
                "Add context, constraints, alternatives and concerns.";
        }
}

    function updateDecisionLensUrl() {
        const url = new URL(window.location.href);

        url.searchParams.set("section", "decisionlens");

        if (state.selectedId) {
            url.searchParams.set("decisionId", state.selectedId);
        } else {
            url.searchParams.delete("decisionId");
        }

        window.history.replaceState({}, "", url);

        requestAnimationFrame(() => {
            applyDecisionLensWorkspaceUX();
        });
    }

    function restoreDecisionLensWorkspace() {
        state.tab = "decisions";

        document.querySelectorAll(".dl-tab").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.dlTab === "decisions"
            );
        });

        const workspace = $("dl-workspace");

        if (workspace) {
            workspace.classList.remove("dl-secondary-view");
        }

        updateDecisionLensUrl();
        renderAll();

        window.setTimeout(() => {
            $("dl-workspace")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }, 0);
    }

    function selectDecision(id) {
        state.selectedId = id;
        fillForm(selected());
        updateDecisionLensUrl();
        renderAll();
    }

    function newDecision() {
        state.selectedId = null;
        updateDecisionLensUrl();
        fillForm(null);
        $("decision-ai-content").innerHTML = `<div class="dl-ai-placeholder">Enter your decision and context, then choose <strong>Analyze with AI</strong>.</div>`;
        renderList();
        renderDetail();
        renderTimeline();
    }

    async function loadDecisions() {
        if (typeof window.api !== "function") return;
        try {
            state.decisions = await window.api("/api/decisions");

            const url = new URL(window.location.href);
            const requestedDecisionId =
                url.searchParams.get("decisionId");

            if (
                requestedDecisionId &&
                state.decisions.some(
                    decision => decision.id === requestedDecisionId
                )
            ) {
                state.selectedId = requestedDecisionId;
            }

            if (state.selectedId && !selected()) {
                state.selectedId = null;
            }

            if (!state.selectedId && state.decisions.length) {
                state.selectedId = state.decisions[0].id;
            }

            fillForm(selected());
            updateDecisionLensUrl();
            renderAll();
        } catch (error) {
            console.error("DecisionLens load failed", error);
            $("decision-list").innerHTML = `<div class="dl-empty-list">Unable to load decisions.</div>`;
        }
    }

    async function analyzeCurrentDecision(event) {
        event.preventDefault();

        if (state.busy || typeof window.api !== "function") return;

        const title = $("decision-title").value.trim();
        const context = $("decision-context").value.trim();

        const options = [
            $("decision-option-1").value.trim(),
            $("decision-option-2").value.trim()
        ].filter(Boolean);

        if (!title) {
            $("decision-title").focus();
            return;
        }

        state.busy = true;

        const button = $("decision-analyze");

        if (button) {
            button.disabled = true;
            button.textContent = "✦ Analyzing...";
        }

        try {
            let decision;

            /*
             * EXISTING DECISION
             *
             * Save edits first, then analyze the SAME Firestore
             * document. This prevents Analyze from creating duplicates.
             */
            if (state.selectedId) {

                await window.api(
                    `/api/decisions/${encodeURIComponent(state.selectedId)}`,
                    {
                        method: "PUT",
                        body: JSON.stringify({
                            title,
                            context,
                            options
                        })
                    }
                );

                const data = await window.api(
                    `/api/decisions/${encodeURIComponent(state.selectedId)}/analyze`,
                    {
                        method: "POST"
                    }
                );

                const current = selected() || {};

                decision = {
                    ...current,
                    id: state.selectedId,
                    title,
                    context,
                    analysis: data.analysis || current.analysis || "",
                    updated_at: new Date().toISOString()
                };

                state.decisions = state.decisions.map(d =>
                    d.id === state.selectedId
                        ? decision
                        : d
                );

            } else {

                /*
                 * NEW DECISION
                 *
                 * Create exactly ONE Firestore record.
                 * The backend performs the initial AI analysis.
                 */
                const data = await window.api(
                    "/api/decisions",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            title,
                            context,
                            options
                        })
                    }
                );

                decision = data.decision || data;

                if (!decision.id && data.id) {
                    decision.id = data.id;
                }

                if (!decision.id) {
                    throw new Error(
                        "Decision ID was not returned by the server."
                    );
                }

                state.selectedId = decision.id;

                state.decisions = [
                    decision,
                    ...state.decisions.filter(
                        d => d.id !== decision.id
                    )
                ];
            }

            fillForm(decision);
            renderAll();

            /*
             * Keep DecisionLens selected after navigation/refresh.
             */
            const url = new URL(window.location.href);

            url.searchParams.set(
                "section",
                "decisionlens"
            );

            window.history.replaceState(
                {},
                "",
                url
            );

        } catch (error) {

            console.error(
                "DecisionLens analysis failed",
                error
            );

            $("decision-ai-content").innerHTML =
                `<div class="dl-error">${
                    escapeHtml(
                        error?.message ||
                        "Decision analysis failed."
                    )
                }</div>`;

        } finally {

            state.busy = false;

            if (button) {
                button.disabled = false;
                button.textContent = "✦ Analyze with AI";
            }
        }
    }

    function setTab(tab) {
        state.tab = tab;

        const backButton =
            $("decision-back-home");

        if (backButton) {
            backButton.textContent =
                tab === "decisions"
                    ? "← Back to Home"
                    : "← Back to DecisionLens";
        }

        document.querySelectorAll(".dl-tab").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.dlTab === tab
            );
        });

        const workspace = $("dl-workspace");

        if (!workspace) return;

        workspace.classList.toggle(
            "dl-secondary-view",
            tab !== "decisions"
        );


        if (tab === "decisions") {
            if (backButton) {
                backButton.textContent = "← Back to Home";
                backButton.dataset.dlBackMode = "home";
            }

            updateDecisionLensUrl();
            return renderAll();
        }

        /*
         * Secondary DecisionLens tools should return to DecisionLens,
         * not directly to Overview.
         */
        if (backButton) {
            backButton.textContent = "← Back to DecisionLens";
            backButton.dataset.dlBackMode = "decisionlens";
        }

        const editor = $("dl-detail-content");

        if (!editor) return;

        if (tab === "compare") {

            editor.innerHTML = `
                <div class="dl-secondary-card">
                    <h3>Decision Comparer</h3>
                    <p>Select two decisions to compare their recommendations, risk and confidence.</p>

                    <div class="dl-compare-grid">
                        <select id="compare-a">
                            ${state.decisions.map(d =>
                                `<option value="${escapeHtml(d.id)}"
                                    ${d.id === state.selectedId ? "selected" : ""}>
                                    ${escapeHtml(d.title)}
                                </option>`
                            ).join("")}
                        </select>

                        <select id="compare-b">
                            ${state.decisions.map(d =>
                                `<option value="${escapeHtml(d.id)}">
                                    ${escapeHtml(d.title)}
                                </option>`
                            ).join("")}
                        </select>
                    </div>

                    <button class="primary-button" type="button" id="compare-run">
                        Compare
                    </button>

                    <div id="compare-result"></div>
                </div>
            `;

            $("compare-run")?.addEventListener("click", () => {
                const a = state.decisions.find(
                    d => d.id === $("compare-a").value
                );

                const b = state.decisions.find(
                    d => d.id === $("compare-b").value
                );

                const aa = parseAnalysis(a?.analysis);
                const bb = parseAnalysis(b?.analysis);

                $("compare-result").innerHTML = `
                    <div class="dl-compare-result">
                        <div>
                            <h4>${escapeHtml(a?.title)}</h4>
                            <p>
                                Recommendation:
                                <b>${escapeHtml(aa.recommendation || "—")}</b>
                            </p>
                            <p>
                                Risk: ${escapeHtml(aa.risk_level || "—")}
                                · Confidence:
                                ${escapeHtml(aa.confidence || "—")}%
                            </p>
                        </div>

                        <div>
                            <h4>${escapeHtml(b?.title)}</h4>
                            <p>
                                Recommendation:
                                <b>${escapeHtml(bb.recommendation || "—")}</b>
                            </p>
                            <p>
                                Risk: ${escapeHtml(bb.risk_level || "—")}
                                · Confidence:
                                ${escapeHtml(bb.confidence || "—")}%
                            </p>
                        </div>
                    </div>
                `;
            });

        } else if (tab === "history") {

            editor.innerHTML = `
                <div class="dl-secondary-card">
                    <h3>Decision History</h3>
                    <p>Your decisions, in chronological order.</p>

                    ${
                        state.decisions.map(d => `
                            <div class="dl-history-row">
                                <span>${escapeHtml(
                                    formatDate(d.created_at) || "—"
                                )}</span>

                                <strong>${escapeHtml(d.title)}</strong>

                                <span>${escapeHtml(
                                    parseAnalysis(
                                        d.analysis || d.ai_analysis
                                    ).recommendation || "Pending"
                                )}</span>
                            </div>
                        `).join("")
                        || "<p>No history yet.</p>"
                    }
                </div>
            `;

        } else if (tab === "outcomes") {

            editor.innerHTML = `
                <div class="dl-secondary-card">
                    <h3>Outcome Tracker</h3>
                    <p>
                        Choose a decision and open its Outcome workspace
                        to record what actually happened.
                    </p>

                    ${state.decisions.map(d => {

                        const outcomeStatus =
                            String(
                                d.outcome_status ||
                                d.outcome ||
                                ""
                            ).trim();

                        const hasOutcome =
                            !!(
                                outcomeStatus ||
                                String(
                                    d.outcome_result || ""
                                ).trim() ||
                                d.outcome_recorded_at
                            );

                        return `
                            <div class="dl-history-row">
                                <strong>${escapeHtml(d.title)}</strong>

                                <span>
                                    ${
                                        hasOutcome
                                            ? "Outcome recorded"
                                            : "Outcome pending"
                                    }
                                </span>

                                <button
                                    type="button"
                                    class="ghost-button"
                                    data-open-outcome="${escapeHtml(d.id)}"
                                >
                                    Open
                                </button>
                            </div>
                        `;
                    }).join("")}
                </div>
            `;

            editor
                .querySelectorAll("[data-open-outcome]")
                .forEach(button => {
                    button.addEventListener("click", () => {
                        selectDecision(button.dataset.openOutcome);

                        state.detail = "outcome";

                        restoreDecisionLensWorkspace();

                        document
                            .querySelectorAll("[data-detail]")
                            .forEach(item => {
                                item.classList.toggle(
                                    "active",
                                    item.dataset.detail === "outcome"
                                );
                            });

                        renderDetail();
                    });
                });

        } else {

            editor.innerHTML = `
                <div class="dl-secondary-card">
                    <h3>Decision Agent</h3>

                    <p>
                        Decision Agent uses the selected decision's AI
                        analysis to surface assumptions, missing information
                        and concrete next actions.
                    </p>

                    <button
                        type="button"
                        class="primary-button"
                        id="agent-run"
                    >
                        Run Decision Agent
                    </button>

                    <div id="agent-result"></div>
                </div>
            `;

            $("agent-run")?.addEventListener("click", () => {

                const d = selected();
                const a = parseAnalysis(d?.analysis);

                $("agent-result").innerHTML = `
                    <div class="dl-agent-output">
                        <h4>Agent Brief</h4>

                        <p>
                            <b>Recommendation:</b>
                            ${escapeHtml(a.recommendation || "Review")}
                        </p>

                        <p>
                            <b>Next step:</b>
                            ${escapeHtml(
                                (a.action_plan || [])[0]
                                || "Clarify the missing information before committing."
                            )}
                        </p>

                        <p>
                            <b>Watch:</b>
                            ${escapeHtml(
                                (a.missing_information || []).join("; ")
                                || "No missing information returned."
                            )}
                        </p>
                    </div>
                `;
            });
        }
    }

    function openDetail(detail) {

        state.detail =
            detail;

        document
            .querySelectorAll(
                "[data-detail]"
            )
            .forEach(item => {

                item.classList.toggle(
                    "active",
                    item.dataset.detail === detail
                );
            });

        renderDetail();

        $("dl-detail-tabs")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
    }


    function bindQuickActions() {

        $("dl-quick-add-action")
            ?.addEventListener(
                "click",
                () => {

                    if (!selected()) {

                        alert(
                            "Select a decision first."
                        );

                        return;
                    }

                    openDetail(
                        "actions"
                    );

                    requestAnimationFrame(
                        () =>
                            $("action-add")
                                ?.click()
                    );
                }
            );


        $("dl-quick-add-outcome")
            ?.addEventListener(
                "click",
                () => {

                    if (!selected()) {

                        alert(
                            "Select a decision first."
                        );

                        return;
                    }

                    openDetail(
                        "outcome"
                    );

                    requestAnimationFrame(
                        () =>
                            $("decision-outcome-status")
                                ?.focus()
                    );
                }
            );


        $("dl-quick-rerun")
            ?.addEventListener(
                "click",
                () => {

                    if (!selected()) {

                        alert(
                            "Select a decision first."
                        );

                        return;
                    }

                    openDetail(
                        "agent"
                    );

                    requestAnimationFrame(
                        () =>
                            $("agent-confirm")
                                ?.click()
                    );
                }
            );


        $("dl-quick-share")
            ?.addEventListener(
                "click",
                async () => {

                    const d =
                        selected();

                    if (!d) {

                        alert(
                            "Select a decision first."
                        );

                        return;
                    }

                    const url =
                        `${location.origin}${location.pathname}?section=decisionlens&decisionId=${encodeURIComponent(d.id)}`;

                    try {

                        await navigator
                            .clipboard
                            .writeText(url);

                        alert(
                            "Decision link copied to clipboard."
                        );

                    } catch (_) {

                        prompt(
                            "Copy this decision link:",
                            url
                        );
                    }
                }
            );


        $("dl-quick-export")
            ?.addEventListener(
                "click",
                () => {

                    const d =
                        selected();

                    if (!d) {

                        alert(
                            "Select a decision first."
                        );

                        return;
                    }

                    const blob =
                        new Blob(
                            [
                                JSON.stringify(
                                    d,
                                    null,
                                    2
                                )
                            ],
                            {
                                type:
                                    "application/json"
                            }
                        );

                    const url =
                        URL.createObjectURL(
                            blob
                        );

                    const link =
                        document.createElement(
                            "a"
                        );

                    const filename =
                        String(
                            d.title ||
                            "export"
                        )
                        .replace(
                            /[^a-z0-9]+/gi,
                            "-"
                        )
                        .replace(
                            /^-|-$/g,
                            ""
                        )
                        .toLowerCase() ||
                        "export";

                    link.href =
                        url;

                    link.download =
                        `decision-${filename}.json`;

                    link.click();

                    URL.revokeObjectURL(
                        url
                    );
                }
            );
    }


    function init() {
        const form = $("decision-form");
        if (!form) return;

        bindQuickActions();

        /*
         * ============================================================
         * DECISIONLENS UX NORMALIZATION
         * ============================================================
         */

        function ensureNewDecisionButton() {

            if ($("decision-new")) return;

            const search =
                $("decision-search");

            const library =
                search?.closest(".dl-library");

            if (!library) return;

            const button =
                document.createElement("button");

            button.type = "button";
            button.id = "decision-new";
            button.className =
                "primary-button dl-new-decision-button";

            button.innerHTML =
                '<span aria-hidden="true">＋</span><span>New Decision</span>';

            if (search) {
                search.parentNode.insertBefore(
                    button,
                    search
                );
            } else {
                library.appendChild(button);
            }
        }



        /*
         * Keep the EXISTING functional New Decision button.
         * We only move the same DOM node to the page header.
         * Existing event listeners and functionality remain intact.
         */
        

        /*
         * Screenshot-aligned DecisionLens header.
         *
         * Uses the EXISTING title, metadata and buttons.
         * No API calls, event listeners or functionality are changed.
         */
        function applyReferenceDecisionHeader() {

            const title =
                document.getElementById(
                    "decision-active-title"
                );

            if (!title) return;

            const edit =
                document.getElementById(
                    "decision-edit-open"
                );

            const duplicate =
                document.getElementById(
                    "decision-duplicate"
                );

            const remove =
                document.getElementById(
                    "decision-delete"
                );

            const analyze =
                document.getElementById(
                    "decision-analyze"
                );

            const hero =
                title.closest(
                    ".dl-decision-hero"
                );

            if (!hero) return;


            /* Avoid rebuilding repeatedly */

            let header =
                hero.querySelector(
                    ".dl-reference-decision-header"
                );

            if (!header) {

                header =
                    document.createElement(
                        "div"
                    );

                header.className =
                    "dl-reference-decision-header";

                hero.prepend(
                    header
                );
            }


            /* Left information area */

            let info =
                header.querySelector(
                    ".dl-reference-decision-info"
                );

            if (!info) {

                info =
                    document.createElement(
                        "div"
                    );

                info.className =
                    "dl-reference-decision-info";

                header.appendChild(
                    info
                );
            }


            /* Move title */

            if (title.parentElement !== info) {

                info.appendChild(
                    title
                );
            }


            /* Existing metadata */

            const metadataCandidates =
                [
                    "#decision-meta",
                    ".dl-decision-meta",
                    ".dl-meta"
                ];

            let metadata = null;

            for (
                const selector
                of metadataCandidates
            ) {

                const element =
                    hero.querySelector(
                        selector
                    );

                if (element) {

                    metadata =
                        element;

                    break;
                }
            }


            if (
                metadata &&
                metadata.parentElement !== info
            ) {

                metadata.classList.add(
                    "dl-reference-meta"
                );

                info.appendChild(
                    metadata
                );
            }


            /* Right actions */

            let actions =
                header.querySelector(
                    ".dl-reference-header-actions"
                );

            if (!actions) {

                actions =
                    document.createElement(
                        "div"
                    );

                actions.className =
                    "dl-reference-header-actions";

                header.appendChild(
                    actions
                );
            }


            /*
             * Preserve original button nodes.
             * Existing click listeners remain attached.
             */

            [
                edit,
                duplicate,
                remove,
                analyze
            ]
            .filter(Boolean)
            .forEach(
                button => {

                    if (
                        button.parentElement !== actions
                    ) {

                        actions.appendChild(
                            button
                        );
                    }
                }
            );
        }




        function moveNewDecisionToPageTop() {

            const button =
                $("decision-new");

            const pageTop =
                document.querySelector(
                    "#decisionlens .dl-page-top"
                );

            if (!button || !pageTop) return;

            let actions =
                pageTop.querySelector(
                    ".dl-page-actions"
                );

            if (!actions) {

                actions =
                    document.createElement("div");

                actions.className =
                    "dl-page-actions";

                pageTop.appendChild(
                    actions
                );
            }

            actions.appendChild(
                button
            );
        }


        function normalizeDecisionHeaderActions() {

            const edit =
                $("decision-edit-open");

            const analyze =
                $("decision-analyze");

            const remove =
                $("decision-delete");

            const buttons =
                [edit, analyze, remove]
                    .filter(Boolean);

            if (buttons.length < 2) return;

            const parent =
                buttons[0].parentElement;

            if (
                !parent ||
                !buttons.every(
                    button =>
                        button.parentElement === parent
                )
            ) {
                return;
            }

            if (
                parent.classList.contains(
                    "dl-header-actions"
                )
            ) {
                return;
            }

            const wrapper =
                document.createElement("div");

            wrapper.className =
                "dl-header-actions";

            parent.insertBefore(
                wrapper,
                buttons[0]
            );

            buttons.forEach(
                button =>
                    wrapper.appendChild(button)
            );
        }


        function bindDecisionToolCards() {

            const toolMap = {
                "Decision Comparer": "compare",
                "Decision History": "history",
                "Outcome Tracker": "outcomes",
                "Decision Agent": "agent"
            };

            document
                .querySelectorAll(
                    "#dl-workspace button, #dl-workspace [role='button']"
                )
                .forEach(element => {

                    if (
                        element.dataset
                            .decisionToolBound
                    ) {
                        return;
                    }

                    const text =
                        element.textContent
                            .replace(/\s+/g, " ")
                            .trim();

                    const tool =
                        Object.entries(toolMap)
                            .find(
                                ([label]) =>
                                    text.startsWith(label)
                            );

                    if (!tool) return;

                    element.dataset
                        .decisionToolBound =
                            "true";

                    element.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();
                            event.stopPropagation();

                            setTab(
                                tool[1]
                            );
                        }
                    );
                });
        }


        /*
         * Keep the functional buttons in their original HTML
         * containers. Do not move, clone, hide, or rewrite them.
         */
        bindDecisionToolCards();

        document
            .querySelectorAll("[data-dl-tool]")
            .forEach(button => {

                if (button.dataset.dlToolBound) {
                    return;
                }

                button.dataset.dlToolBound = "true";

                button.addEventListener(
                    "click",
                    () => {
                        setTab(
                            button.dataset.dlTool
                        );
                    }
                );

            });


        /*
         * When inside a secondary Decision Tool,
         * Back must always return to DecisionLens.
         */
        document.addEventListener(
            "click",
            event => {

                const back =
                    event.target.closest(
                        "#decision-back-home"
                    );

                if (
                    !back ||
                    !state.tab ||
                    state.tab === "decisions"
                ) {
                    return;
                }

                event.preventDefault();
                event.stopImmediatePropagation();

                setTab("decisions");

            },
            true
        );
        form.addEventListener("submit", analyzeCurrentDecision);
        $("decision-new")?.addEventListener("click", newDecision);
        $("decision-generate")?.addEventListener("click", () => form.requestSubmit());
        $("decision-search")?.addEventListener("input", renderList);
        document.querySelectorAll(".dl-tab").forEach(b => b.addEventListener("click", () => setTab(b.dataset.dlTab)));
        document.querySelectorAll("[data-detail]").forEach(b => b.addEventListener("click", () => { state.detail=b.dataset.detail; document.querySelectorAll("[data-detail]").forEach(x=>x.classList.toggle("active",x===b)); renderDetail(); }));
        $("decision-save")?.addEventListener("click", async () => {

            if (state.busy || typeof window.api !== "function") {
                return;
            }

            const title = $("decision-title").value.trim();
            const context = $("decision-context").value.trim();

            const options = [
                $("decision-option-1").value.trim(),
                $("decision-option-2").value.trim()
            ].filter(Boolean);

            if (!title) {
                $("decision-title").focus();
                return;
            }

            const button = $("decision-save");

            if (button) {
                button.disabled = true;
                button.textContent = "Saving...";
            }

            try {

                /*
                 * EXISTING DECISION -> UPDATE
                 */
                if (state.selectedId) {

                    const data = await window.api(
                        `/api/decisions/${encodeURIComponent(state.selectedId)}`,
                        {
                            method: "PUT",
                            body: JSON.stringify({
                                title,
                                context,
                                options
                            })
                        }
                    );

                    state.decisions = state.decisions.map(d =>
                        d.id === state.selectedId
                            ? {
                                ...d,
                                ...(data.decision || data),
                                id: state.selectedId,
                                title,
                                context
                            }
                            : d
                    );

                } else {

                    /*
                     * NEW DECISION -> CREATE
                     */
                    const data = await window.api(
                        "/api/decisions",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                title,
                                context,
                                options
                            })
                        }
                    );

                    const created =
                        data.decision || data;

                    const id =
                        created.id || data.id;

                    if (!id) {
                        throw new Error(
                            "Decision ID was not returned by the server."
                        );
                    }

                    const decision = {
                        ...created,
                        id,
                        title,
                        context
                    };

                    state.selectedId = id;

                    state.decisions = [
                        decision,
                        ...state.decisions.filter(
                            d => d.id !== id
                        )
                    ];
                }

                fillForm(selected());
                renderAll();

            } catch (error) {

                console.error(
                    "DecisionLens save failed",
                    error
                );

                alert(
                    error?.message ||
                    "Unable to save the decision."
                );

            } finally {

                if (button) {
                    button.disabled = false;
                    button.textContent = "Save";
                }
            }
        });

        /*
         * DELETE SELECTED DECISION
         */
        $("decision-delete")?.addEventListener(
            "click",
            async () => {

                if (
                    state.busy ||
                    !state.selectedId ||
                    typeof window.api !== "function"
                ) {
                    return;
                }

                const current = selected();

                if (!current) return;

                const confirmed = window.confirm(
                    `Delete "${current.title || "this decision"}"?\n\n` +
                    "This will permanently delete the decision and its AI analysis."
                );

                if (!confirmed) return;

                const button = $("decision-delete");

                if (button) {
                    button.disabled = true;
                    button.textContent = "Deleting...";
                }

                try {

                    await window.api(
                        `/api/decisions/${encodeURIComponent(state.selectedId)}`,
                        {
                            method: "DELETE"
                        }
                    );

                    state.decisions =
                        state.decisions.filter(
                            d => d.id !== state.selectedId
                        );

                    state.selectedId =
                        state.decisions.length
                            ? state.decisions[0].id
                            : null;

                    state.detail = "workspace";

                    fillForm(selected());
                    renderAll();

                } catch (error) {

                    console.error(
                        "DecisionLens delete failed",
                        error
                    );

                    alert(
                        error?.message ||
                        "Unable to delete the decision."
                    );

                } finally {

                    if (button) {
                        button.disabled = false;
                        button.textContent = "Delete";
                    }
                }
            }
        );

        /*
         * Final workspace controls.
         */
        const modal = $("decision-modal");

        function openDecisionModal(mode = "edit") {

            if (!modal) return;

            const title = $("decision-modal-title");

            if (title) {
                title.textContent =
                    mode === "new"
                        ? "Create Decision"
                        : "Edit Decision";
            }

            modal.hidden = false;
            modal.setAttribute("aria-hidden", "false");

            window.setTimeout(() => {
                $("decision-title")?.focus();
            }, 0);
        }

        function closeDecisionModal() {

            if (!modal) return;

            modal.hidden = true;
            modal.setAttribute("aria-hidden", "true");
        }

        $("decision-new")?.addEventListener(
            "click",
            () => {
                state.selectedId = null;
                fillForm(null);
                state.detail = "workspace";
                renderAll();
                openDecisionModal("new");
            }
        );

        $("decision-edit-open")?.addEventListener(
            "click",
            () => {
                if (!selected()) return;
                openDecisionModal("edit");
            }
        );

        $("decision-context-edit")?.addEventListener(
            "click",
            () => {
                if (!selected()) return;
                openDecisionModal("edit");
            }
        );

        document
            .querySelectorAll("[data-decision-modal-close]")
            .forEach(button =>
                button.addEventListener(
                    "click",
                    closeDecisionModal
                )
            );

        $("decision-back-home")?.addEventListener(
            "click",
            () => {
                /*
                 * When inside a DecisionLens tool:
                 * return one level up to DecisionLens.
                 */
                if (state.tab && state.tab !== "decisions") {
                    restoreDecisionLensWorkspace();
                    return;
                }

                /*
                 * From the main DecisionLens workspace:
                 * return to Overview.
                 */
                document
                    .querySelector('[data-section="overview"]')
                    ?.click();
            }
        );

        $("decision-form")?.addEventListener(
            "submit",
            () => {
                window.setTimeout(closeDecisionModal, 300);
            }
        );

        if (typeof window.api === "function") loadDecisions(); else window.addEventListener("api-ready", loadDecisions, { once: true });
    }

    init();
})();
