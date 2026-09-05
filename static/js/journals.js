(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    let journals = [];
    let selectedId = null;

    const esc = value =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    function shortText(value, length = 145) {
        const text = String(value || "")
            .replace(/\s+/g, " ")
            .trim();

        return text.length > length
            ? text.slice(0, length - 1) + "…"
            : text;
    }

    function formatDate(value) {
        if (!value) return "Recently";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Recently";
        }

        return date.toLocaleDateString(
            undefined,
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );
    }

    function clearEditor() {
        $("journal-id").value = "";
        $("journal-title").value = "";
        $("journal-content").value = "";

        const status = $("journal-analysis-status");

        if (status) {
            status.textContent = "";
        }

        selectedId = null;
    }

    function focusEditor() {
        clearEditor();

        const card =
            document.querySelector(
                ".journal-create-card"
            );

        card?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        setTimeout(() => {
            $("journal-content")?.focus();
        }, 250);
    }

    function selectJournal(journal) {
        if (!journal) return;

        selectedId = journal.id;

        $("journal-id").value =
            journal.id || "";

        $("journal-title").value =
            journal.title || "";

        $("journal-content").value =
            journal.content || "";

        renderEntries();
        renderInsights(journal);

        document
            .querySelector(".journal-create-card")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }

    function renderEntries() {
        const list = $("journal-list");

        if (!list) return;

        const query =
            ($("journal-search")?.value || "")
                .trim()
                .toLowerCase();

        const filtered =
            journals.filter(journal => {

                const title =
                    String(
                        journal.title || ""
                    ).toLowerCase();

                const content =
                    String(
                        journal.content || ""
                    ).toLowerCase();

                return (
                    !query ||
                    title.includes(query) ||
                    content.includes(query)
                );
            });

        list.innerHTML = "";

        $("journal-empty").hidden =
            filtered.length !== 0;

        if (!filtered.length) {
            $("journal-count").hidden = true;
            return;
        }

        filtered.forEach(journal => {

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "journal-entry-card" +
                (
                    journal.id === selectedId
                        ? " active"
                        : ""
                );

            const analyzed =
                Boolean(
                    journal.ai_analysis
                );

            card.innerHTML = `
                <div class="journal-entry-card-top">

                    <div class="journal-entry-copy">

                        <h4>
                            ${esc(
                                journal.title ||
                                "Untitled entry"
                            )}
                        </h4>

                        <p>
                            ${esc(
                                shortText(
                                    journal.content
                                )
                            )}
                        </p>

                    </div>

                    <span
                        class="
                            journal-entry-status
                            ${analyzed ? "analyzed" : ""}
                        ">

                        ${
                            analyzed
                                ? "Analyzed"
                                : "Entry"
                        }

                    </span>

                </div>

                <div class="journal-entry-card-bottom">

                    <span>
                        ${formatDate(
                            journal.updated_at ||
                            journal.created_at
                        )}
                    </span>

                    <div>

                        <button
                            type="button"
                            class="journal-card-open">

                            Open

                        </button>

                    </div>

                </div>
            `;

            card.addEventListener(
                "click",
                event => {

                    if (
                        event.target.closest(
                            "button"
                        )
                    ) {
                        return;
                    }

                    selectJournal(
                        journal
                    );
                }
            );

            card
                .querySelector(
                    ".journal-card-open"
                )
                ?.addEventListener(
                    "click",
                    () => {
                        selectJournal(
                            journal
                        );
                    }
                );

            list.appendChild(
                card
            );
        });

        $("journal-count").hidden = false;

        $("journal-count").textContent =
            `${filtered.length} ${
                filtered.length === 1
                    ? "entry"
                    : "entries"
            }`;
    }

    function parseAnalysis(raw) {

        const output = {
            summary: "",
            themes: [],
            takeaways: [],
            steps: []
        };

        const text =
            String(raw || "").trim();

        if (!text) {
            return output;
        }

        const lines =
            text
                .split(/\r?\n/)
                .map(line =>
                    line.trim()
                )
                .filter(Boolean);

        let section = "";

        const buckets = {
            summary: [],
            themes: [],
            takeaways: [],
            steps: []
        };

        for (
            const originalLine
            of lines
        ) {

            const line =
                originalLine
                    .replace(
                        /^#{1,6}\s*/,
                        ""
                    )
                    .trim();

            const heading =
                line
                    .replace(
                        /[^a-z]/gi,
                        ""
                    )
                    .toLowerCase();

            if (
                /summary|keythought|reflection/.test(
                    heading
                )
            ) {
                section = "summary";
                continue;
            }

            if (
                /theme/.test(
                    heading
                )
            ) {
                section = "themes";
                continue;
            }

            if (
                /takeaway|insight|whatwentwell|challenge/.test(
                    heading
                )
            ) {
                section =
                    "takeaways";

                continue;
            }

            if (
                /nextstep|suggestedaction|action/.test(
                    heading
                )
            ) {
                section =
                    "steps";

                continue;
            }

            const clean =
                line
                    .replace(
                        /^[-*•]\s*/,
                        ""
                    )
                    .trim();

            if (
                clean &&
                section
            ) {
                buckets[section]
                    .push(clean);
            }
        }

        output.summary =
            buckets.summary[0] ||
            lines
                .filter(
                    line =>
                        !/^#{1,6}\s/.test(
                            line
                        )
                )[0] ||
            "";

        output.themes =
            buckets.themes
                .slice(0, 5);

        output.takeaways =
            buckets.takeaways
                .slice(0, 5);

        output.steps =
            buckets.steps
                .slice(0, 5);

        return output;
    }

    function renderInsights(journal) {

        const data =
            parseAnalysis(
                journal?.ai_analysis
            );

        $("journal-ai-summary").textContent =
            data.summary ||
            "Select an entry or analyze a saved entry to see its reflection here.";

        const themes =
            $("journal-ai-themes");

        themes.innerHTML =
            data.themes.length
                ? data.themes
                    .map(theme => `
                        <span class="journal-theme-chip">
                            ${esc(theme)}
                        </span>
                    `)
                    .join("")
                : `
                    <span class="journal-theme-empty">
                        Your themes will appear here
                    </span>
                `;

        $("journal-ai-takeaways").innerHTML =
            (
                data.takeaways.length
                    ? data.takeaways
                    : [
                        "Analyze an entry to surface key ideas."
                    ]
            )
                .map(item => `
                    <li>
                        ${esc(item)}
                    </li>
                `)
                .join("");

        $("journal-ai-steps").innerHTML =
            (
                data.steps.length
                    ? data.steps
                    : [
                        "Choose one practical next step."
                    ]
            )
                .map(item => `
                    <li>
                        ${esc(item)}
                    </li>
                `)
                .join("");
    }

    async function loadJournals() {

        const list =
            $("journal-list");

        if (!list) return;

        try {

            const response =
                await window.api(
                    "/api/journals"
                );

            journals =
                Array.isArray(
                    response
                )
                    ? response
                    : (
                        response?.journals ||
                        []
                    );

            if (
                selectedId
            ) {

                const selected =
                    journals.find(
                        journal =>
                            journal.id ===
                            selectedId
                    );

                if (
                    selected
                ) {
                    renderInsights(
                        selected
                    );
                }
            }

            renderEntries();

        } catch (error) {

            console.error(
                "Journal loading failed:",
                error
            );

            list.innerHTML = `
                <div class="journal-load-error">

                    <strong>
                        Unable to load journal entries.
                    </strong>

                    <span>
                        ${
                            esc(
                                error.message ||
                                "Please refresh and try again."
                            )
                        }
                    </span>

                </div>
            `;
        }
    }

    async function saveJournal(
        analyzeAfterSave = false
    ) {

        const content =
            $("journal-content")
                .value
                .trim();

        if (!content) {

            $("journal-content")
                .focus();

            return null;
        }

        let title =
            $("journal-title")
                .value
                .trim();

        if (!title) {

            title =
                shortText(
                    content,
                    70
                );
        }

        const id =
            $("journal-id")
                .value
                .trim();

        const saveButton =
            document.querySelector(
                "#journal-form [type='submit']"
            );

        if (
            saveButton
        ) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                "Saving…";
        }

        try {

            const response =
                await window.api(
                    id
                        ? `/api/journals/${encodeURIComponent(id)}`
                        : "/api/journals",
                    {
                        method:
                            id
                                ? "PUT"
                                : "POST",

                        body:
                            JSON.stringify({
                                title,
                                content
                            })
                    }
                );

            const journalId =
                id ||
                response?.id;

            await loadJournals();

            if (
                journalId
            ) {

                const journal =
                    await window.api(
                        `/api/journals/${encodeURIComponent(
                            journalId
                        )}`
                    );

                selectedId =
                    journalId;

                $("journal-id").value =
                    journal.id || "";

                $("journal-title").value =
                    journal.title || "";

                $("journal-content").value =
                    journal.content || "";

                renderInsights(
                    journal
                );

                renderEntries();

                if (
                    analyzeAfterSave
                ) {

                    await analyzeJournal(
                        journalId
                    );
                }

                return journal;
            }

            return null;

        } finally {

            if (
                saveButton
            ) {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    "Save Entry";
            }
        }
    }

    async function analyzeJournal(
        existingId = null
    ) {

        const status =
            $("journal-analysis-status");

        try {

            let journalId =
                existingId ||
                $("journal-id")
                    .value
                    .trim();

            if (
                !journalId
            ) {

                await saveJournal(
                    false
                );

                journalId =
                    $("journal-id")
                        .value
                        .trim();
            }

            if (
                !journalId
            ) {
                return;
            }

            status.textContent =
                "Gemini is analyzing your entry…";

            await window.api(
                `/api/journals/${encodeURIComponent(
                    journalId
                )}/analyze`,
                {
                    method: "POST"
                }
            );

            const journal =
                await window.api(
                    `/api/journals/${encodeURIComponent(
                        journalId
                    )}`
                );

            selectedId =
                journalId;

            renderInsights(
                journal
            );

            await loadJournals();

            status.textContent =
                "Analysis saved.";

        } catch (error) {

            console.error(
                "Journal analysis failed:",
                error
            );

            status.textContent =
                error.message ||
                "Unable to analyze this entry.";

        }
    }

    function bindEvents() {

        $("journal-form")
            ?.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    try {

                        await saveJournal(
                            false
                        );

                    } catch (error) {

                        alert(
                            error.message ||
                            "Unable to save journal."
                        );
                    }
                }
            );

        $("journal-new-entry")
            ?.addEventListener(
                "click",
                focusEditor
            );

        $("journal-empty-new")
            ?.addEventListener(
                "click",
                focusEditor
            );

        $("journal-cancel")
            ?.addEventListener(
                "click",
                clearEditor
            );

        $("journal-analyze")
            ?.addEventListener(
                "click",
                async () => {

                    await analyzeJournal();

                }
            );

        $("journal-search")
            ?.addEventListener(
                "input",
                renderEntries
            );

        $("journal-open-chat")
            ?.addEventListener(
                "click",
                () => {

                    window.location.href =
                        "/chat";
                }
            );

        document
            .querySelectorAll(
                "[data-journal-tab]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const tab =
                            button.dataset
                                .journalTab;

                        document
                            .querySelectorAll(
                                "[data-journal-tab]"
                            )
                            .forEach(item =>
                                item.classList
                                    .toggle(
                                        "active",
                                        item === button
                                    )
                            );

                        document
                            .querySelectorAll(
                                "[data-journal-insight]"
                            )
                            .forEach(panel => {

                                panel.hidden =
                                    panel.dataset
                                        .journalInsight !==
                                    tab;
                            });
                    }
                );
            });
    }

    function init() {

        if (
            window.__journalUxLoaded
        ) {
            return;
        }

        window.__journalUxLoaded =
            true;

        bindEvents();

        window.loadJournals =
            loadJournals;

        loadJournals();
    }

    if (
        typeof window.api ===
        "function"
    ) {

        init();

    } else {

        window.addEventListener(
            "api-ready",
            init,
            { once: true }
        );
    }

})();
