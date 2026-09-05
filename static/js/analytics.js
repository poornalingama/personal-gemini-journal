(function () {
    "use strict";

    if (window.__analyticsFeatureLoaded) return;
    window.__analyticsFeatureLoaded = true;

    async function loadAnalyticsFeature() {
        const output =
            document.getElementById("analytics-data");

        if (!output) return;

        output.textContent = "Loading analytics...";

        try {
            const data =
                await window.api("/api/analytics");

            output.innerHTML = "";

            const values =
                data && typeof data === "object"
                    ? data
                    : {};

            const entries =
                Object.entries(values);

            if (!entries.length) {
                output.textContent =
                    "No analytics available yet.";
                return;
            }

            entries.forEach(([key, value]) => {
                const card =
                    document.createElement("div");

                card.className = "feature-card";

                const label =
                    document.createElement("strong");

                label.textContent =
                    key
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, c =>
                            c.toUpperCase()
                        );

                const number =
                    document.createElement("div");

                number.textContent =
                    String(value ?? "—");

                card.appendChild(label);
                card.appendChild(number);

                output.appendChild(card);
            });

        } catch (error) {
            output.textContent =
                "Unable to load analytics.";
            console.error(error);
        }
    }

    window.loadAnalyticsFeature =
        loadAnalyticsFeature;
})();
