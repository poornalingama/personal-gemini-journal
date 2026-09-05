(function () {
    "use strict";

    if (window.__searchFeatureLoaded) return;
    window.__searchFeatureLoaded = true;

    const form =
        document.getElementById("search-form");

    const input =
        document.getElementById("search-input");

    const output =
        document.getElementById("search-results");

    if (!form || !input || !output) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const query =
            input.value.trim();

        if (!query) {
            output.textContent =
                "Enter something to search.";
            return;
        }

        output.textContent =
            "Searching your private data...";

        try {
            const data =
                await window.api(
                    `/api/search?q=${encodeURIComponent(query)}`
                );

            const results =
                Array.isArray(data)
                    ? data
                    : (data.results || []);

            output.innerHTML = "";

            if (!results.length) {
                output.textContent =
                    "No matching results.";
                return;
            }

            results.forEach(result => {
                const card =
                    document.createElement("div");

                card.className =
                    "feature-card";

                card.textContent =
                    result.title ||
                    result.content ||
                    result.name ||
                    JSON.stringify(result);

                output.appendChild(card);
            });

        } catch (error) {
            output.textContent =
                "Search is temporarily unavailable.";
            console.error(error);
        }
    });
})();
