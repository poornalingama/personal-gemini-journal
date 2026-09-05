(function () {
    "use strict";

    if (window.__bookmarksFeatureLoaded) return;
    window.__bookmarksFeatureLoaded = true;

    function el(id) {
        return document.getElementById(id);
    }

    async function loadBookmarks() {
        const list = el("bookmark-list");
        if (!list) return;

        list.textContent = "Loading bookmarks...";

        try {
            const data =
                await window.api("/api/bookmarks");

            const bookmarks =
                Array.isArray(data)
                    ? data
                    : (data.bookmarks || []);

            list.innerHTML = "";

            if (!bookmarks.length) {
                list.textContent =
                    "No bookmarks yet.";
                return;
            }

            bookmarks.forEach(bookmark => {
                const wrapper =
                    document.createElement("div");

                wrapper.className =
                    "feature-card";

                const title =
                    document.createElement("strong");

                title.textContent =
                    bookmark.title ||
                    "Untitled bookmark";

                const content =
                    document.createElement("div");

                content.textContent =
                    bookmark.content || "";

                const deleteButton =
                    document.createElement("button");

                deleteButton.type = "button";
                deleteButton.textContent = "Delete";

                deleteButton.addEventListener(
                    "click",
                    async () => {
                        if (
                            !confirm(
                                "Delete this bookmark?"
                            )
                        ) {
                            return;
                        }

                        try {
                            await window.api(
                                `/api/bookmarks/${bookmark.id}`,
                                { method: "DELETE" }
                            );

                            await loadBookmarks();

                        } catch (error) {
                            alert(error.message);
                        }
                    }
                );

                wrapper.appendChild(title);
                wrapper.appendChild(content);
                wrapper.appendChild(deleteButton);

                list.appendChild(wrapper);
            });

        } catch (error) {
            list.textContent =
                "Unable to load bookmarks.";
            console.error(error);
        }
    }

    const form = el("bookmark-form");

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        const button =
            form.querySelector("button");

        if (button) {
            button.disabled = true;
            button.textContent = "Saving...";
        }

        try {
            await window.api(
                "/api/bookmarks",
                {
                    method: "POST",
                    body: JSON.stringify({
                        title:
                            el("bookmark-title")?.value || "",

                        content:
                            el("bookmark-content")?.value || ""
                    })
                }
            );

            form.reset();
            await loadBookmarks();

        } catch (error) {
            alert(error.message);

        } finally {
            if (button) {
                button.disabled = false;
                button.textContent =
                    "Save Bookmark";
            }
        }
    });

    window.loadBookmarks = loadBookmarks;
})();
