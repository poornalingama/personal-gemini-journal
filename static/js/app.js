import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    firebaseConfig
} from "./firebase-config.js";


const firebaseApp =
    initializeApp(firebaseConfig);

const auth =
    getAuth(firebaseApp);


let currentUser = null;

let chatHistory = [];


async function api(path, options = {}) {

    if (!currentUser) {
        throw new Error(
            "Authentication required"
        );
    }

    const token =
        await currentUser.getIdToken();

    const headers = {
        ...(options.headers || {}),
        "Authorization":
            `Bearer ${token}`,
        "Content-Type":
            "application/json"
    };

    const response =
        await fetch(
            path,
            {
                ...options,
                headers
            }
        );

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {

        const error =
            new Error(
                data.error ||
                data.message ||
                `Request failed (${response.status})`
            );

        error.code =
            data.code ||
            "";

        error.status =
            response.status;

        throw error;
    }

    return data;
}


/*
 * Do NOT expose the API yet.
 *
 * Firebase authentication is restored asynchronously.
 * Feature modules must wait until currentUser exists.
 *
 * window.api and api-ready are initialized inside
 * onAuthStateChanged() after authentication is ready.
 */

function showSection(
    id,
    persist = true
) {

    // Safety: only allow an existing section.
    const target =
        document.getElementById(id);

    if (!target) {
        id = "overview";
    }

    if (
        persist &&
        id
    ) {
        const url =
            new URL(
                window.location.href
            );

        url.searchParams.set(
            "section",
            id
        );

        window.history.replaceState(
            {
                section: id
            },
            "",
            url
        );
    }

    /*
     * STRICT PAGE SWITCHING
     *
     * Remove active state AND hide every section first.
     * This guarantees Journal and Calendar can never
     * appear together.
     */
    document
        .querySelectorAll(".section")
        .forEach(section => {

            section.classList.remove(
                "active"
            );

            section.hidden = true;
        });

    /*
     * Show only the requested section.
     */
    const activeSection =
        document.getElementById(id);

    if (activeSection) {

        activeSection.hidden = false;

        activeSection.classList.add(
            "active"
        );
    }

    /*
     * Update all navigation buttons.
     */
    document
        .querySelectorAll("[data-section]")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.section === id
            );
        });

    /*
     * Always return the actual active section.
     */
    return id;
}


const initialSection =
    new URLSearchParams(
        window.location.search
    ).get("section")
    || "overview";

showSection(
    initialSection,
    false
);

document
    .querySelectorAll("[data-section]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                if (
                    button.dataset.section ===
                    "chat"
                ) {
                    window.location.href =
                        "/chat";

                    return;
                }

                showSection(
                    button.dataset.section
                );

                if (
                    button.dataset.section ===
                    "overview"
                ) {
                    loadAnalytics();
                }

                if (
                    button.dataset.section ===
                    "journals"
                ) {
                    loadJournals();
                }

                if (
                    button.dataset.section ===
                    "goals"
                ) {
                    loadGoals();
                }

                if (
                    button.dataset.section ===
                    "calendar"
                ) {
                    loadCalendar();
                }

                if (
                    button.dataset.section ===
                    "bookmarks"
                ) {
                    loadBookmarks();
                }
            }
        );
    });


document
    .getElementById("logout")
    ?.addEventListener(
        "click",
        async () => {

            await signOut(auth);

            window.location.href = "/";
        }
    );


document
    .getElementById("chat-form")
    ?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const input =
                document.getElementById(
                    "chat-input"
                );

            const message =
                input.value.trim();

            if (!message) return;

            addChat(
                "You",
                message
            );

            input.value = "";

            try {

                const data =
                    await api(
                        "/api/chat",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                message,
                                history:
                                    chatHistory
                            })
                        }
                    );

                addChat(
                    "Gemini",
                    data.reply
                );

                chatHistory.push({
                    role: "user",
                    text: message
                });

                chatHistory.push({
                    role: "model",
                    text: data.reply
                });

            } catch (error) {

                addChat(
                    "System",
                    error.message
                );
            }
        }
    );


function addChat(role, text) {

    const box =
        document.getElementById(
            "chat-messages"
        );

    const item =
        document.createElement("div");

    item.className =
        "chat-message";

    item.innerHTML =
        `<strong>${escapeHtml(role)}</strong>
         <p>${escapeHtml(text)}</p>`;

    box.appendChild(item);

    box.scrollTop =
        box.scrollHeight;
}


async function loadAnalytics() {

    try {

        const data =
            await api("/api/analytics");

        const output =
            document.getElementById(
                "analytics-data"
            );

        output.innerHTML = "";

        Object.entries(data)
            .forEach(
                ([key, value]) => {

                    const card =
                        document.createElement(
                            "div"
                        );

                    card.className =
                        "stat-card";

                    card.innerHTML = `
                        <strong>${escapeHtml(key)}</strong>
                        <span>${value}</span>
                    `;

                    output.appendChild(card);
                }
            );

        const stats =
            document.getElementById(
                "stats"
            );

        stats.innerHTML = `
            <div class="stat-card">
                <strong>Total Activity</strong>
                <span>${data.total_activity}</span>
            </div>

            <div class="stat-card">
                <strong>Journals</strong>
                <span>${data.journals}</span>
            </div>

            <div class="stat-card">
                <strong>Conversations</strong>
                <span>${data.conversations}</span>
            </div>

            <div class="stat-card">
                <strong>Goals</strong>
                <span>${data.goals}</span>
            </div>
        `;

    } catch (error) {

        console.error(error);
    }
}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href = "/";

            return;
        }

        currentUser = user;

        /*
         * Firebase authentication is now ready.
         * Expose the authenticated API only after currentUser
         * has been established, then notify all feature modules.
         */
        window.api = api;

        window.dispatchEvent(
            new Event("api-ready")
        );

        const backend =
            await api("/api/auth/me");

        document
            .getElementById(
                "user-email"
            )
            .textContent =
            backend.email || "";

        await loadAnalytics();
    }
);


/* ============================================================
   JOURNAL AI ANALYSIS MODAL CONTROLS
   ============================================================ */

function closeJournalAnalysis() {

    const panel =
        document.getElementById(
            "journal-analysis"
        );

    if (panel) {
        panel.hidden = true;
    }

    document.body.classList.remove(
        "journal-analysis-open"
    );
}


document
    .getElementById(
        "journal-analysis-close"
    )
    ?.addEventListener(
        "click",
        closeJournalAnalysis
    );


document
    .getElementById(
        "journal-analysis-backdrop"
    )
    ?.addEventListener(
        "click",
        closeJournalAnalysis
    );


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            const panel =
                document.getElementById(
                    "journal-analysis"
                );

            if (
                panel &&
                !panel.hidden
            ) {
                closeJournalAnalysis();
            }
        }
    }
);
