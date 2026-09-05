import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { firebaseConfig } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

let currentUser = null;
let conversationId = null;
let conversations = [];
let journals = [];
let attachedJournal = null;
let conversationStartedAt = null;

const messagesElement = document.getElementById("chat-messages");
const inputElement = document.getElementById("chat-input");
const formElement = document.getElementById("chat-form");
const sendButton = document.getElementById("send-message");
const newEntryButton = document.getElementById("new-entry");
const conversationList = document.createElement("div");

const messageCountElement = document.getElementById("message-count");
const conversationStartedElement = document.getElementById("conversation-started");
const conversationSummaryElement = document.getElementById("conversation-summary");
const topicChipsElement = document.getElementById("topic-chips");
const relatedEntriesElement = document.getElementById("related-entries");
const conversationHistoryElement = document.getElementById("conversation-history");

const attachModal = document.getElementById("attach-modal");
const attachEntryList = document.getElementById("attach-entry-list");

function formatDate(value) {
    if (!value) return "Today";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Today";
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function formatDateTime(value) {
    if (!value) return "Today";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Today";
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function timeNow() {
    return new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

function setLoading(loading) {
    if (sendButton) sendButton.disabled = loading;
    if (inputElement) inputElement.disabled = loading;
    if (newEntryButton) newEntryButton.disabled = loading;
}

async function authHeaders() {
    if (!currentUser) throw new Error("You are not signed in.");
    const token = await currentUser.getIdToken();
    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}

function clearMessages() {
    if (messagesElement) messagesElement.innerHTML = "";
}

function messageText(role, content) {
    return String(content || "").trim();
}

function createMessageAction(label, symbol, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "message-action";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.textContent = symbol;
    button.addEventListener("click", handler);
    return button;
}

function addMessage(role, content, options = {}) {
    if (!messagesElement) return;

    const empty = messagesElement.querySelector(".empty-state");
    if (empty) empty.remove();

    const wrapper = document.createElement("article");
    wrapper.className = `chat-message ${role}`;

    if (role === "assistant") {
        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = "✦";
        wrapper.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    const contentElement = document.createElement("div");
    contentElement.className = "message-content";
    contentElement.textContent = messageText(role, content);
    bubble.appendChild(contentElement);

    if (!options.thinking) {
        const footer = document.createElement("div");
        footer.className = "message-footer";

        const time = document.createElement("span");
        time.textContent = options.time || timeNow();

        const actions = document.createElement("div");
        actions.className = "message-actions";

        if (role === "assistant") {
            actions.appendChild(createMessageAction("Copy response", "⧉", async () => {
                try {
                    await navigator.clipboard.writeText(messageText(role, content));
                } catch {
                    window.prompt("Copy this response:", messageText(role, content));
                }
            }));
            actions.appendChild(createMessageAction("Helpful", "♧", event => {
                event.currentTarget.style.color = "#2d9a66";
            }));
            actions.appendChild(createMessageAction("Not helpful", "♤", event => {
                event.currentTarget.style.color = "#b65b5b";
            }));
        }

        footer.appendChild(time);
        footer.appendChild(actions);
        bubble.appendChild(footer);
    }

    wrapper.appendChild(bubble);
    messagesElement.appendChild(wrapper);
    messagesElement.scrollTop = messagesElement.scrollHeight;

    updateIntelligencePanel();
}

function showThinking() {
    if (!messagesElement || document.getElementById("gemini-thinking")) return;

    const wrapper = document.createElement("article");
    wrapper.id = "gemini-thinking";
    wrapper.className = "chat-message assistant";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "✦";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble thinking-bubble";
    bubble.innerHTML = '<span>Gemini is thinking</span> <span class="thinking-dots"><span>•</span><span>•</span><span>•</span></span>';

    wrapper.append(avatar, bubble);
    messagesElement.appendChild(wrapper);
    messagesElement.scrollTop = messagesElement.scrollHeight;
}

function hideThinking() {
    document.getElementById("gemini-thinking")?.remove();
}

function getCurrentMessages() {
    return [...messagesElement.querySelectorAll(".chat-message:not(.thinking-message) .message-content")]
        .map(node => ({
            role: node.closest(".chat-message")?.classList.contains("assistant") ? "assistant" : "user",
            content: node.textContent.trim()
        }))
        .filter(item => item.content);
}

function extractTopics(text) {
    const stop = new Set([
        "about","after","again","also","and","are","best","been","before","but","can","could",
        "for","from","have","help","here","into","journal","just","like","more","need","not",
        "our","that","the","their","them","then","this","today","what","when","with","would",
        "your","you","gemini","entry","entries","conversation","project"
    ]);

    const words = String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter(word => word.length >= 4 && !stop.has(word));

    const counts = new Map();
    for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);

    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([word]) => word.replace(/(^|-)\w/g, match => match.toUpperCase()));
}

function buildConversationSummary(messages) {
    if (!messages.length) {
        return "Start a conversation and Gemini will help surface the main ideas discussed here.";
    }

    const userMessages = messages.filter(message => message.role === "user").map(message => message.content);
    const assistantMessages = messages.filter(message => message.role === "assistant").map(message => message.content);

    const firstQuestion = userMessages[0] || "";
    const latestResponse = assistantMessages.at(-1) || "";

    if (userMessages.length === 1 && assistantMessages.length === 0) {
        return `You started by asking: “${firstQuestion.slice(0, 170)}${firstQuestion.length > 170 ? "…" : ""}”`;
    }

    const responseLead = latestResponse
        .replace(/\s+/g, " ")
        .slice(0, 220);

    return `This conversation explores ${userMessages.length} question${userMessages.length === 1 ? "" : "s"} from your journal context. Gemini’s latest guidance focuses on: ${responseLead}${latestResponse.length > 220 ? "…" : ""}`;
}

function updateIntelligencePanel() {
    const messages = getCurrentMessages();

    if (messageCountElement) {
        messageCountElement.textContent = `${messages.length} message${messages.length === 1 ? "" : "s"}`;
    }

    if (!conversationStartedAt && messages.length) {
        conversationStartedAt = new Date().toISOString();
    }

    if (conversationStartedElement) {
        conversationStartedElement.textContent = formatDateTime(conversationStartedAt);
    }

    if (conversationSummaryElement) {
        conversationSummaryElement.textContent = buildConversationSummary(messages);
    }

    const topics = extractTopics(messages.map(message => message.content).join(" "));

    if (topicChipsElement) {
        topicChipsElement.innerHTML = "";

        if (!topics.length) {
            const empty = document.createElement("span");
            empty.className = "topic-empty";
            empty.textContent = "Topics will appear here";
            topicChipsElement.appendChild(empty);
        } else {
            for (const topic of topics) {
                const chip = document.createElement("span");
                chip.className = "topic-chip";
                chip.textContent = topic;
                topicChipsElement.appendChild(chip);
            }
        }
    }
}

function renderRelatedEntries() {
    if (!relatedEntriesElement) return;

    relatedEntriesElement.innerHTML = "";

    if (!journals.length) {
        relatedEntriesElement.innerHTML = '<div class="panel-placeholder">No journal entries yet. Create one to add personal context to your chat.</div>';
        return;
    }

    const conversationText = getCurrentMessages()
        .map(message => message.content)
        .join(" ")
        .toLowerCase();

    const scored = journals
        .map(journal => {
            const haystack = `${journal.title || ""} ${journal.content || ""}`.toLowerCase();
            let score = 0;

            for (const token of extractTopics(conversationText).map(topic => topic.toLowerCase())) {
                if (haystack.includes(token)) score += 2;
            }

            if (attachedJournal?.id === journal.id) score += 10;

            return { journal, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    for (const { journal } of scored) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "related-entry";
        button.innerHTML = `
            <span class="related-entry-icon">▣</span>
            <span>
                <span class="related-entry-title">${escapeHtml(journal.title || "Untitled Journal")}</span>
                <span class="related-entry-date">${formatDate(journal.updated_at || journal.created_at)}</span>
            </span>
        `;

        button.addEventListener("click", () => {
            window.location.href = `/journals?entry=${encodeURIComponent(journal.id)}`;
        });

        relatedEntriesElement.appendChild(button);
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function loadJournals() {
    const headers = await authHeaders();
    const response = await fetch("/api/journals", { headers });

    if (!response.ok) {
        throw new Error("Unable to load journal entries");
    }

    const data = await response.json();
    journals = Array.isArray(data) ? data : [];
    renderRelatedEntries();
    renderAttachEntries();
}

function renderAttachEntries() {
    if (!attachEntryList) return;

    attachEntryList.innerHTML = "";

    if (!journals.length) {
        attachEntryList.innerHTML = '<div class="panel-placeholder">No journal entries available yet.</div>';
        return;
    }

    for (const journal of journals.slice(0, 20)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "attach-choice";

        const preview = String(journal.content || "").replace(/\s+/g, " ").slice(0, 145);

        button.innerHTML = `
            <strong>${escapeHtml(journal.title || "Untitled Journal")}</strong>
            <small>${escapeHtml(preview)}${preview.length >= 145 ? "…" : ""}</small>
        `;

        button.addEventListener("click", () => {
            attachedJournal = journal;
            attachModal.hidden = true;

            const context = `Use this journal entry as context:\n\nTitle: ${journal.title || "Untitled Journal"}\nContent: ${journal.content || ""}\n\nMy question: `;
            inputElement.value = context;
            inputElement.focus();

            renderRelatedEntries();
        });

        attachEntryList.appendChild(button);
    }
}


function formatConversationDate(value) {
    if (!value) return "Recent";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Recent";
    }

    const today = new Date();

    const sameDay =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();

    if (sameDay) {
        return "Today";
    }

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
    });
}


function renderConversationHistory() {

    if (!conversationHistoryElement) {
        return;
    }

    conversationHistoryElement.innerHTML = "";


    if (!conversations.length) {

        const empty = document.createElement("div");

        empty.className = "history-placeholder";

        empty.innerHTML = `
            <div class="history-empty-icon">✦</div>
            <strong>No conversations yet</strong>
            <span>Start a new chat and it will appear here automatically.</span>
        `;

        conversationHistoryElement.appendChild(empty);

        return;
    }


    for (const conversation of conversations) {

        const button = document.createElement("button");

        button.type = "button";

        button.className = "conversation-history-item";

        if (conversation.id === conversationId) {
            button.classList.add("active");
        }


        const title =
            String(
                conversation.title ||
                "New conversation"
            ).trim() || "New conversation";


        button.innerHTML = `
            <span class="conversation-history-icon">✦</span>

            <span class="conversation-history-copy">

                <strong>
                    ${escapeHtml(title)}
                </strong>

                <small>
                    ${formatConversationDate(conversation.updated_at)}
                </small>

            </span>
        `;


        button.addEventListener(
            "click",
            async () => {

                if (
                    conversation.id === conversationId
                ) {
                    return;
                }

                try {

                    await loadConversation(
                        conversation.id
                    );

                    renderConversationHistory();

                    if (messagesElement) {
                        messagesElement.scrollTop = 0;
                    }

                } catch (error) {

                    console.error(error);

                    alert(
                        "Unable to load this conversation. Please try again."
                    );

                }

            }
        );


        conversationHistoryElement.appendChild(
            button
        );

    }

}

async function loadConversations() {
    const headers = await authHeaders();
    const response = await fetch("/api/chat/conversations", { headers });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Unable to load conversations");
    }

    conversations = data.conversations || [];
    renderConversationHistory();
    return conversations;
}

async function loadConversation(id) {
    const headers = await authHeaders();
    const response = await fetch(`/api/chat/conversations/${encodeURIComponent(id)}`, { headers });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Unable to load conversation");
    }

    conversationId = data.conversation_id;
    conversationStartedAt = new Date().toISOString();

    const url = new URL(window.location.href);
    url.searchParams.set("conversation", conversationId);
    window.history.replaceState({ conversationId }, "", url);

    clearMessages();

    for (const message of data.messages || []) {
        addMessage(message.role, message.content);
    }

    updateIntelligencePanel();
    renderRelatedEntries();
    renderConversationHistory();

    if (messagesElement) {
        messagesElement.scrollTop = 0;
    }
}

function startNewChat() {
    conversationId = null;
    conversationStartedAt = new Date().toISOString();
    attachedJournal = null;

    const url = new URL(window.location.href);
    url.searchParams.delete("conversation");
    window.history.replaceState({}, "", url);

    clearMessages();

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
        <div class="empty-icon">✦</div>
        <h2>What would you like to think through?</h2>
        <p>Ask about your journal entries, brainstorm ideas, reflect on your progress, or plan your next step.</p>
        <div class="chat-suggestions">
            <button type="button" data-prompt="Help me reflect on the themes across my recent journal entries.">Reflect on my journal</button>
            <button type="button" data-prompt="What patterns do you notice in my goals and progress?">Find patterns</button>
            <button type="button" data-prompt="Help me decide the best next step for my current project.">Plan my next step</button>
        </div>
    `;
    messagesElement.appendChild(empty);
    bindSuggestionButtons();
    updateIntelligencePanel();
    renderRelatedEntries();
    renderConversationHistory();
    inputElement?.focus();
}

async function sendMessage(message) {
    const headers = await authHeaders();
    const response = await fetch("/api/chat/message", {
        method: "POST",
        headers,
        body: JSON.stringify({
            message,
            conversation_id: conversationId
        })
    });

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.message || data.error || "Unable to send message");
        error.code = data.code || "";
        throw error;
    }

    conversationId = data.conversation_id;
    addMessage("assistant", data.message);

    const url = new URL(window.location.href);
    url.searchParams.set("conversation", conversationId);
    window.history.replaceState({ conversationId }, "", url);

    await loadConversations();
}

function bindSuggestionButtons() {
    document.querySelectorAll("[data-prompt]").forEach(button => {
        if (button.dataset.bound) return;
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
            inputElement.value = button.dataset.prompt || "";
            inputElement.focus();
        });
    });
}

formElement?.addEventListener("submit", async event => {
    event.preventDefault();

    const message = inputElement?.value.trim();
    if (!message) return;

    inputElement.value = "";

    addMessage("user", message);

    setLoading(true);
    showThinking();

    try {
        await sendMessage(message);
        hideThinking();
        renderRelatedEntries();
    } catch (error) {
        hideThinking();
        console.error(error);

        if (error?.code === "quota_exceeded") {
            addMessage("assistant", "Gemini’s free-tier request limit has been reached. Your conversation is safe. Please try again after the limit resets.");
        } else {
            addMessage("assistant", error?.message || "Sorry, Gemini is temporarily unavailable. Please try again.");
        }
    } finally {
        setLoading(false);
        inputElement?.focus();
    }
});

document.getElementById("new-entry")?.addEventListener("click", event => {
    event.preventDefault();
    startNewChat();
});

document.getElementById("history-new-chat")?.addEventListener("click", event => {
    event.preventDefault();
    startNewChat();
});

document.getElementById("attach-entry")?.addEventListener("click", () => {
    attachModal.hidden = false;
});

document.getElementById("close-attach-modal")?.addEventListener("click", () => {
    attachModal.hidden = true;
});

attachModal?.addEventListener("click", event => {
    if (event.target === attachModal) attachModal.hidden = true;
});

document.getElementById("add-context")?.addEventListener("click", () => {
    const prefix = "Please consider my journal context and help me think through this:\n\n";
    if (!inputElement.value.trim()) inputElement.value = prefix;
    inputElement.focus();
});

document.getElementById("refresh-related")?.addEventListener("click", async () => {
    try {
        await loadJournals();
    } catch (error) {
        console.error(error);
    }
});

document.getElementById("action-new-entry")?.addEventListener("click", event => {
    event.preventDefault();
    startNewChat();
});

document.getElementById("action-related")?.addEventListener("click", () => {
    document.getElementById("attach-entry")?.click();
});

document.getElementById("save-key-insights")?.addEventListener("click", () => {
    const payload = {
        savedAt: new Date().toISOString(),
        conversationId,
        summary: conversationSummaryElement?.textContent || "",
        topics: [...document.querySelectorAll(".topic-chip")].map(node => node.textContent)
    };

    localStorage.setItem("personal-gemini-journal-last-chat-insights", JSON.stringify(payload));

    const button = document.getElementById("save-key-insights");
    const previous = button.textContent;
    button.textContent = "✓ Key insights saved";
    setTimeout(() => {
        button.textContent = previous;
    }, 1800);
});

document.getElementById("chat-menu")?.addEventListener("click", () => {
    if (confirm("Start a new conversation?")) startNewChat();
});

bindSuggestionButtons();

onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "/";
        return;
    }

    currentUser = user;

    try {
        const url = new URL(window.location.href);
        const requestedConversation = url.searchParams.get("conversation");

        await Promise.all([
            loadConversations(),
            loadJournals()
        ]);

        renderConversationHistory();

        if (requestedConversation) {
            await loadConversation(requestedConversation);
        } else if (conversations.length > 0) {
            await loadConversation(conversations[0].id);
        } else {
            conversationStartedAt = new Date().toISOString();
            updateIntelligencePanel();
        }
    } catch (error) {
        console.error(error);
        if (relatedEntriesElement) {
            relatedEntriesElement.innerHTML = '<div class="panel-placeholder">Unable to load related entries right now.</div>';
        }
    }
});


/* ============================================================
   FINAL CHAT ACTION FIX
   ============================================================ */

(function () {

    function beginFreshChat() {

        if (typeof startNewChat === "function") {
            startNewChat();
            return;
        }

        /* Fallback: stay on Chat and remove conversation parameter */

        const url = new URL(window.location.href);

        url.searchParams.delete("conversation");

        window.history.pushState({}, "", url.pathname);

        window.location.reload();
    }


    function attachNewChatAction(id) {

        const button = document.getElementById(id);

        if (!button) return;

        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();

                beginFreshChat();
            },
            true
        );
    }


    attachNewChatAction("new-entry");

    attachNewChatAction("action-new-entry");


    /* Safety: replace any remaining visible action text */

    document.querySelectorAll("button, a").forEach(function (element) {

        const value = element.textContent.trim();

        if (
            value === "Create new journal entry" ||
            value.includes("Create new journal entry")
        ) {

            element.textContent =
                value.replace(
                    "Create new journal entry",
                    "Start a new chat"
                );


            element.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    event.stopPropagation();

                    beginFreshChat();
                },
                true
            );
        }
    });

})();

