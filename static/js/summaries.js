(function () {
    "use strict";

    if (window.__summariesFeatureLoaded) return;

    window.__summariesFeatureLoaded = true;

    const form =
        document.getElementById(
            "summary-form"
        );

    const output =
        document.getElementById(
            "summary-output"
        );

    const stamp =
        document.getElementById(
            "summary-last-generated"
        );

    if (!form || !output) return;


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


    function canonical(raw) {

        const t =
            String(raw || "")
                .replace(/^#+\s*/, "")
                .replace(/\*\*/g, "")
                .replace(/[:\-]+$/, "")
                .trim()
                .toUpperCase();


        if (
            t === "OVERALL" ||
            t.includes("JOURNAL SUMMARY") ||
            t.includes("OVERVIEW")
        ) {
            return "Overall";
        }

        if (
            t.includes("TAKEAWAY")
        ) {
            return "Key Takeaways";
        }

        if (
            t.includes("IMPROV") ||
            t.includes("PROGRESS")
        ) {
            return "What's Improving";
        }

        if (
            t.includes("LEARNING")
        ) {
            return "Important Learnings";
        }

        if (
            t.includes("RECOMMEND") ||
            t.includes("FOCUS") ||
            t.includes("NEXT STEP")
        ) {
            return "Recommended Focus";
        }

        return null;
    }


    function parse(text) {

        const found = {};

        let current = null;


        String(text || "")
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

                if (current) {

                    const item =
                        value
                            .replace(
                                /^[-•*]\s*/,
                                ""
                            )
                            .replace(
                                /^\d+[.)]\s*/,
                                ""
                            )
                            .trim();

                    if (item) {
                        found[current]
                            .push(item);
                    }
                }
            });


        if (
            !Object.keys(found).length
        ) {

            const chunks =
                String(text || "")
                    .split(/\n\s*\n/)
                    .map(
                        value =>
                            value.trim()
                    )
                    .filter(Boolean);


            found.Overall =
                chunks.shift()
                ||
                String(text || "").trim();


            if (chunks.length) {
                found[
                    "Key Takeaways"
                ] = chunks;
            }
        }


        return found;
    }


    function body(items) {

        if (!items?.length) {
            return `
                <p>
                    No saved content for this
                    section yet.
                </p>
            `;
        }


        if (items.length === 1) {
            return `
                <p>
                    ${esc(items[0])}
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
                    No saved summary yet.
                    Generate one when you are ready.
                </div>
            `;

            if (stamp) {
                stamp.textContent =
                    "Not generated yet";
            }

            return;
        }


        const data =
            parse(result.content);


        if (stamp) {

            stamp.textContent =
                formatDate(
                    result.generated_at
                );
        }


        const rows = [

            [
                "📋",
                "Overall",
                data.Overall
            ],

            [
                "◎",
                "Key Takeaways",
                data[
                    "Key Takeaways"
                ]
            ],

            [
                "↗",
                "What's Improving",
                data[
                    "What's Improving"
                ]
            ],

            [
                "💡",
                "Important Learnings",
                data[
                    "Important Learnings"
                ]
            ],

            [
                "✦",
                "Recommended Focus",
                data[
                    "Recommended Focus"
                ]
            ]

        ].filter(
            (
                [, , items]
            ) =>
                items?.length
        );


        output.innerHTML = `

            <div
                class="ai-summary-list">

                ${
                    rows
                        .map(
                            (
                                [
                                    icon,
                                    title,
                                    items
                                ]
                            ) => `

                                <article
                                    class="
                                        ai-summary-row
                                    ">

                                    <div
                                        class="
                                            ai-summary-row-icon
                                        ">
                                        ${icon}
                                    </div>

                                    <div>

                                        <h3>
                                            ${title}
                                        </h3>

                                        ${body(items)}

                                    </div>

                                </article>

                            `
                        )
                        .join("")
                }

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
                        Your latest summary is saved
                        securely and loaded automatically
                        when you return. Generate again
                        whenever you want a fresh
                        perspective.
                    </span>

                </div>

            </div>

        `;
    }


    async function load() {

        try {

            const data =
                await window.api(
                    "/api/summaries/latest",
                    {
                        method: "GET"
                    }
                );

            render(
                data?.summary || null
            );

        } catch (error) {

            console.error(
                "Unable to load saved summary",
                error
            );

            output.innerHTML = `
                <div class="ai-saved-empty">
                    Your saved summary could not be
                    loaded right now.
                </div>
            `;
        }
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const button =
                form.querySelector(
                    "button"
                );


            if (button) {

                button.disabled = true;

                button.textContent =
                    "Generating summary...";
            }


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
                            Gemini is creating your summary
                        </strong>

                        <br>

                        <small>
                            Reviewing your journal entries
                            and organising the important
                            points...
                        </small>

                    </div>

                </div>
            `;


            try {

                const data =
                    await window.api(
                        "/api/summaries",
                        {
                            method: "POST"
                        }
                    );

                render(
                    data?.summary || null
                );

            } catch (error) {

                console.error(error);

                output.innerHTML = `
                    <div
                        class="
                            ai-insights-error
                        ">

                        ${
                            esc(
                                error?.message ||
                                "Unable to generate summary."
                            )
                        }

                    </div>
                `;

            } finally {

                if (button) {

                    button.disabled = false;

                    button.textContent =
                        "✦ Generate new summary";
                }
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
