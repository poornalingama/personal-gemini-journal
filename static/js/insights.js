(function () {
    "use strict";

    if (window.__insightsFeatureLoaded) return;

    window.__insightsFeatureLoaded = true;

    const button =
        document.getElementById("generate-insight");

    const output =
        document.getElementById("insight-output");

    const stamp =
        document.getElementById(
            "insights-last-analysed"
        );

    if (!button || !output) return;


    const esc = value =>
        String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");


    function formatDate(value) {

        if (!value) {
            return "Not generated yet";
        }

        try {

            return new Date(value)
                .toLocaleString(
                    undefined,
                    {
                        dateStyle: "medium",
                        timeStyle: "short"
                    }
                );

        } catch (_) {

            return "Saved";
        }
    }


    function clean(value) {

        return String(value || "")
            .replace(/^#+\s*/gm, "")
            .replace(/\*\*/g, "")
            .trim();
    }


    function canonical(raw) {

        const t =
            clean(raw)
                .toUpperCase()
                .replace(/[:\-]+$/, "");

        if (
            t.includes("KEY REFLECTION") ||
            t === "REFLECTION"
        ) {
            return "Key Reflection";
        }

        if (
            t.includes("RECURRING") ||
            t.includes("THEME")
        ) {
            return "Recurring Themes";
        }

        if (
            t.includes("POSITIVE PROGRESS") ||
            t === "PROGRESS"
        ) {
            return "Positive Progress";
        }

        if (
            t.includes("CHALLENGE") ||
            t.includes("OPEN QUESTION")
        ) {
            return "Challenges & Open Questions";
        }

        if (
            t.includes("NEXT STEP") ||
            t.includes("RECOMMEND")
        ) {
            return "Suggested Next Step";
        }

        return null;
    }


    function parse(text) {

        const found = {};

        let current = null;

        clean(text)
            .split(/\r?\n/)
            .forEach(line => {

                const value =
                    line.trim();

                if (!value) return;

                const title =
                    canonical(value);

                if (title) {

                    current = title;

                    found[current] ||= [];

                    return;
                }

                if (!current) return;

                const item =
                    value
                        .replace(/^[-•*]\s*/, "")
                        .replace(/^\d+[.)]\s*/, "")
                        .trim();

                if (item) {
                    found[current].push(item);
                }
            });


        if (
            !Object.keys(found).length
        ) {
            found["Key Reflection"] = [
                clean(text)
            ];
        }


        return {
            "Key Reflection":
                found["Key Reflection"] || [],

            "Recurring Themes":
                found["Recurring Themes"] || [],

            "Positive Progress":
                found["Positive Progress"] || [],

            "Challenges & Open Questions":
                found[
                    "Challenges & Open Questions"
                ] || [],

            "Suggested Next Step":
                found[
                    "Suggested Next Step"
                ] || []
        };
    }


    function list(items) {

        if (!items.length) {

            return `
                <p>
                    No clear pattern was returned
                    for this section yet.
                </p>
            `;
        }

        return `
            <ul>
                ${
                    items
                        .map(
                            item =>
                                `<li>
                                    ${esc(item)}
                                </li>`
                        )
                        .join("")
                }
            </ul>
        `;
    }


    function render(result) {

        if (
            !result ||
            !result.content
        ) {

            output.innerHTML = `
                <div class="ai-saved-empty">
                    No saved AI insights yet.
                    Generate your first reflection
                    when you are ready.
                </div>
            `;

            if (stamp) {
                stamp.textContent =
                    "Not generated yet";
            }

            return;
        }


        const sections =
            parse(result.content);


        if (stamp) {

            stamp.textContent =
                formatDate(
                    result.generated_at
                );
        }


        output.innerHTML = `

            <div
                class="ai-reference-insight-grid">

                <article
                    class="
                        ai-reference-card
                        ai-reference-card--reflection
                    ">

                    <div
                        class="ai-reference-card-head">

                        <div
                            class="
                                ai-reference-card-icon
                            ">
                            💡
                        </div>

                        <h3>
                            Key Reflection
                        </h3>

                    </div>

                    <p>
                        ${
                            esc(
                                sections[
                                    "Key Reflection"
                                ].join(" ")
                            )
                            ||
                            "No reflection available yet."
                        }
                    </p>

                </article>


                <article
                    class="
                        ai-reference-card
                        ai-reference-card--themes
                    ">

                    <div
                        class="
                            ai-reference-card-head
                        ">

                        <div
                            class="
                                ai-reference-card-icon
                            ">
                            ↻
                        </div>

                        <h3>
                            Recurring Themes
                        </h3>

                    </div>

                    ${
                        list(
                            sections[
                                "Recurring Themes"
                            ]
                        )
                    }

                </article>


                <article
                    class="
                        ai-reference-card
                        ai-reference-card--progress
                    ">

                    <div
                        class="
                            ai-reference-card-head
                        ">

                        <div
                            class="
                                ai-reference-card-icon
                            ">
                            ↗
                        </div>

                        <h3>
                            Positive Progress
                        </h3>

                    </div>

                    ${
                        list(
                            sections[
                                "Positive Progress"
                            ]
                        )
                    }

                </article>


                <article
                    class="
                        ai-reference-card
                        ai-reference-card--challenge
                    ">

                    <div
                        class="
                            ai-reference-card-head
                        ">

                        <div
                            class="
                                ai-reference-card-icon
                            ">
                            △
                        </div>

                        <h3>
                            Challenges /
                            Open Questions
                        </h3>

                    </div>

                    ${
                        list(
                            sections[
                                "Challenges & Open Questions"
                            ]
                        )
                    }

                </article>


                <article
                    class="
                        ai-reference-card
                        ai-reference-card--next
                        ai-reference-card--wide
                    ">

                    <div
                        class="
                            ai-reference-card-icon
                        ">
                        🚀
                    </div>

                    <div
                        class="
                            ai-reference-next-body
                        ">

                        <h3>
                            Suggested Next Step
                        </h3>

                        <p>
                            ${
                                esc(
                                    sections[
                                        "Suggested Next Step"
                                    ].join(" ")
                                )
                                ||
                                "Generate a new insight when you are ready for a fresh perspective."
                            }
                        </p>

                    </div>


                    <div
                        class="
                            ai-reference-action-idea
                        ">

                        <div>✦</div>

                        <div>

                            <strong>
                                Action idea
                            </strong>

                            <span>
                                Turn the next step into one
                                small action you can complete
                                this week.
                            </span>

                        </div>

                    </div>

                </article>

            </div>


            <div
                class="ai-reference-help"
                style="margin-top:16px">

                <div
                    class="
                        ai-reference-help-icon
                    ">
                    i
                </div>

                <div>

                    <strong>
                        How this works
                    </strong>

                    <span>
                        Gemini reviews your saved journal
                        entries and highlights patterns,
                        progress and useful next steps.
                        Your latest result is saved and
                        shown automatically.
                    </span>

                </div>

            </div>
        `;
    }


    async function load() {

        try {

            const data =
                await window.api(
                    "/api/insights",
                    {
                        method: "GET"
                    }
                );

            render(
                data?.insights || null
            );

        } catch (error) {

            console.error(
                "Unable to load saved insights",
                error
            );

            output.innerHTML = `
                <div class="ai-saved-empty">
                    Your saved insights could not be
                    loaded right now.
                </div>
            `;
        }
    }


    button.addEventListener(
        "click",
        async () => {

            button.disabled = true;

            button.textContent =
                "Generating insights...";


            output.innerHTML = `
                <div
                    class="ai-insights-loading">

                    <span
                        class="
                            ai-insights-loading-dot
                        ">
                    </span>

                    <div>

                        <strong>
                            Gemini is reviewing your journal
                        </strong>

                        <br>

                        <small>
                            Looking for patterns, progress
                            and meaningful next steps...
                        </small>

                    </div>

                </div>
            `;


            try {

                const data =
                    await window.api(
                        "/api/insights",
                        {
                            method: "POST"
                        }
                    );

                render(
                    data?.insights || null
                );

            } catch (error) {

                console.error(error);

                output.innerHTML = `
                    <div
                        class="ai-insights-error">

                        ${
                            esc(
                                error?.message ||
                                "Unable to generate insights."
                            )
                        }

                    </div>
                `;

            } finally {

                button.disabled = false;

                button.textContent =
                    "✦ Generate new insights";
            }
        }
    );


    window.addEventListener(
        "api-ready",
        load,
        {
            once: true
        }
    );


    if (
        typeof window.api ===
        "function"
    ) {
        load();
    }

})();
