(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    let events = [];
    let currentMonth = new Date();

    currentMonth.setDate(1);


    function pad(value) {
        return String(value).padStart(2, "0");
    }


    function dateKey(date) {
        return [
            date.getFullYear(),
            pad(date.getMonth() + 1),
            pad(date.getDate())
        ].join("-");
    }


    function normalize(event) {
        return {
            ...event,
            date: event.date || event.event_date || "",
            time: event.time || event.event_time || ""
        };
    }


    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }


    function monthLabel(date) {
        return date.toLocaleDateString(
            undefined,
            {
                month: "long",
                year: "numeric"
            }
        );
    }


    function eventColor(event) {
        let hash = 0;

        const value =
            String(event.id || event.title || "");

        for (let i = 0; i < value.length; i++) {
            hash =
                value.charCodeAt(i) +
                ((hash << 5) - hash);
        }

        return Math.abs(hash) % 6;
    }


    function openModal(event = null, date = "") {

        const modal =
            $("calendar-modal");

        if (!modal) return;

        $("calendar-event-id").value =
            event?.id || "";

        $("calendar-title").value =
            event?.title || "";

        $("calendar-date").value =
            event?.date ||
            date ||
            dateKey(new Date());

        $("calendar-time").value =
            event?.time || "";

        $("calendar-modal-title").textContent =
            event ? "Edit Event" : "Add Event";

        $("calendar-form-submit").textContent =
            event ? "Save Changes" : "Add Event";

        $("calendar-delete-event").hidden =
            !event;

        modal.hidden = false;

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";

        setTimeout(
            () => $("calendar-title")?.focus(),
            50
        );
    }


    function closeModal() {

        const modal =
            $("calendar-modal");

        if (!modal) return;

        modal.hidden = true;

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow = "";

        $("calendar-form")?.reset();

        $("calendar-event-id").value = "";

        $("calendar-delete-event").hidden =
            true;
    }


    async function loadEvents() {

        try {

            const data =
                await window.api(
                    "/api/calendar"
                );

            const raw =
                Array.isArray(data)
                    ? data
                    : (data.events || []);

            events =
                raw.map(normalize);

            render();

        } catch (error) {

            console.error(
                "Calendar load failed:",
                error
            );

            $("calendar-upcoming").innerHTML =
                "<p>Unable to load events.</p>";
        }
    }


    function render() {

        $("calendar-month-label").textContent =
            monthLabel(currentMonth);

        renderMonth();

        renderUpcoming();

        renderInsight();
    }


    function renderMonth() {

        const grid =
            $("calendar-month-grid");

        if (!grid) return;

        grid.innerHTML = "";

        const year =
            currentMonth.getFullYear();

        const month =
            currentMonth.getMonth();

        const firstDay =
            new Date(
                year,
                month,
                1
            ).getDay();

        const daysInMonth =
            new Date(
                year,
                month + 1,
                0
            ).getDate();

        const previousMonthDays =
            new Date(
                year,
                month,
                0
            ).getDate();

        const today =
            dateKey(new Date());

        for (let index = 0; index < 42; index++) {

            const dayNumber =
                index - firstDay + 1;

            let cellDate;
            let outside = false;

            if (dayNumber < 1) {

                cellDate =
                    new Date(
                        year,
                        month - 1,
                        previousMonthDays +
                        dayNumber
                    );

                outside = true;

            } else if (
                dayNumber >
                daysInMonth
            ) {

                cellDate =
                    new Date(
                        year,
                        month + 1,
                        dayNumber -
                        daysInMonth
                    );

                outside = true;

            } else {

                cellDate =
                    new Date(
                        year,
                        month,
                        dayNumber
                    );
            }

            const key =
                dateKey(cellDate);

            const dayEvents =
                events.filter(
                    event =>
                        event.date === key
                );

            const cell =
                document.createElement(
                    "div"
                );

            cell.className =
                "calendar-day-cell" +
                (outside
                    ? " outside"
                    : "") +
                (key === today
                    ? " today"
                    : "");

            cell.innerHTML =
                `<button
                    type="button"
                    class="calendar-day-number"
                    aria-label="Add event on ${key}">
                    ${cellDate.getDate()}
                </button>
                <div class="calendar-events-stack"></div>`;

            cell
                .querySelector(
                    ".calendar-day-number"
                )
                .addEventListener(
                    "click",
                    () => openModal(
                        null,
                        key
                    )
                );

            const stack =
                cell.querySelector(
                    ".calendar-events-stack"
                );

            dayEvents
                .slice(0, 4)
                .forEach(event => {

                    const button =
                        document.createElement(
                            "button"
                        );

                    button.type =
                        "button";

                    button.className =
                        "calendar-event-pill color-" +
                        eventColor(event);

                    button.innerHTML =
                        `<span>${escapeHTML(
                            event.time || "Any time"
                        )}</span>
                         <strong>${escapeHTML(
                            event.title
                        )}</strong>`;

                    button.addEventListener(
                        "click",
                        click => {

                            click.stopPropagation();

                            openModal(event);
                        }
                    );

                    stack.appendChild(
                        button
                    );
                });

            if (
                dayEvents.length > 4
            ) {

                const more =
                    document.createElement(
                        "button"
                    );

                more.type =
                    "button";

                more.className =
                    "calendar-more-events";

                more.textContent =
                    `+${dayEvents.length - 4} more`;

                more.onclick =
                    () => openModal(
                        null,
                        key
                    );

                stack.appendChild(more);
            }

            grid.appendChild(cell);
        }
    }


    function sortedUpcoming() {

        const today =
            dateKey(new Date());

        return [...events]
            .filter(
                event =>
                    event.date >= today
            )
            .sort(
                (a, b) =>
                    `${a.date} ${a.time}`.localeCompare(
                        `${b.date} ${b.time}`
                    )
            );
    }


    function renderUpcoming() {

        const container =
            $("calendar-upcoming");

        if (!container) return;

        const upcoming =
            sortedUpcoming()
                .slice(0, 6);

        if (!upcoming.length) {

            container.innerHTML =
                `<div class="calendar-upcoming-empty">
                    No upcoming events yet.
                 </div>`;

            return;
        }

        container.innerHTML =
            "";

        upcoming.forEach(event => {

            const item =
                document.createElement(
                    "button"
                );

            item.type =
                "button";

            item.className =
                "calendar-upcoming-item";

            const date =
                new Date(
                    event.date +
                    "T12:00:00"
                );

            item.innerHTML =
                `<span class="calendar-upcoming-date">
                    ${date.toLocaleDateString(
                        undefined,
                        {
                            month: "short",
                            day: "numeric"
                        }
                    )}
                 </span>

                 <span class="calendar-upcoming-copy">
                    <strong>${escapeHTML(
                        event.title
                    )}</strong>

                    <small>
                        ${escapeHTML(
                            event.time ||
                            "Any time"
                        )}
                    </small>
                 </span>`;

            item.onclick =
                () => openModal(event);

            container.appendChild(item);
        });
    }


    function renderInsight() {

        const element =
            $("calendar-assistant-text");

        if (!element) return;

        const today =
            dateKey(new Date());

        const todayEvents =
            events.filter(
                event =>
                    event.date === today
            );

        if (!todayEvents.length) {

            element.textContent =
                "Your schedule is open today. Add an important event and protect time for what matters.";

            return;
        }

        element.textContent =
            `You have ${todayEvents.length} event${
                todayEvents.length === 1
                    ? ""
                    : "s"
            } today. Focus on what matters most.`;
    }


    async function saveEvent(event) {

        event.preventDefault();

        const form =
            event.currentTarget;

        const submit =
            $("calendar-form-submit");

        const id =
            $("calendar-event-id")
                .value
                .trim();

        const title =
            $("calendar-title")
                .value
                .trim();

        const date =
            $("calendar-date")
                .value;

        const time =
            $("calendar-time")
                .value;

        if (!title || !date) {

            alert(
                "Please enter an event title and date."
            );

            return;
        }

        submit.disabled = true;

        try {

            const url =
                id
                    ? `/api/calendar/${encodeURIComponent(id)}`
                    : "/api/calendar";

            const response =
                await window.api(
                    url,
                    {
                        method:
                            id ? "PUT" : "POST",

                        body:
                            JSON.stringify(
                                {
                                    title,
                                    event_date: date,
                                    event_time: time
                                }
                            )
                    }
                );

            const saved =
                normalize(
                    {
                        ...response,
                        id:
                            response?.id ||
                            id,
                        title,
                        date,
                        time
                    }
                );

            if (id) {

                const index =
                    events.findIndex(
                        item =>
                            item.id === id
                    );

                if (index >= 0) {
                    events[index] =
                        {
                            ...events[index],
                            ...saved
                        };
                }

            } else {

                events.push(saved);
            }

            currentMonth =
                new Date(
                    date +
                    "T12:00:00"
                );

            currentMonth.setDate(1);

            closeModal();

            render();

        } catch (error) {

            console.error(
                "Calendar save failed:",
                error
            );

            alert(
                error.message ||
                "Unable to save event."
            );

        } finally {

            submit.disabled =
                false;
        }
    }


    async function deleteEvent() {

        const id =
            $("calendar-event-id")
                .value
                .trim();

        if (!id) return;

        if (
            !confirm(
                "Delete this event?"
            )
        ) {
            return;
        }

        const button =
            $("calendar-delete-event");

        button.disabled = true;

        try {

            await window.api(
                `/api/calendar/${encodeURIComponent(id)}`,
                {
                    method:
                        "DELETE"
                }
            );

            events =
                events.filter(
                    event =>
                        event.id !== id
                );

            closeModal();

            render();

        } catch (error) {

            console.error(
                "Calendar delete failed:",
                error
            );

            alert(
                error.message ||
                "Unable to delete event."
            );

        } finally {

            button.disabled =
                false;
        }
    }


    function bind() {

        $("calendar-add-event")
            ?.addEventListener(
                "click",
                () => openModal()
            );

        $("calendar-prev")
            ?.addEventListener(
                "click",
                () => {

                    currentMonth.setMonth(
                        currentMonth.getMonth() - 1
                    );

                    render();
                }
            );

        $("calendar-next")
            ?.addEventListener(
                "click",
                () => {

                    currentMonth.setMonth(
                        currentMonth.getMonth() + 1
                    );

                    render();
                }
            );

        $("calendar-today")
            ?.addEventListener(
                "click",
                () => {

                    currentMonth =
                        new Date();

                    currentMonth.setDate(1);

                    render();
                }
            );

        $("calendar-form")
            ?.addEventListener(
                "submit",
                saveEvent
            );

        $("calendar-form-cancel")
            ?.addEventListener(
                "click",
                closeModal
            );

        $("calendar-delete-event")
            ?.addEventListener(
                "click",
                deleteEvent
            );

        document
            .querySelectorAll(
                "[data-calendar-modal-close]"
            )
            .forEach(button =>
                button.addEventListener(
                    "click",
                    closeModal
                )
            );

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {
                    closeModal();
                }
            }
        );
    }


    function start() {

        bind();

        if (
            typeof window.api ===
            "function"
        ) {

            loadEvents();

        } else {

            window.addEventListener(
                "api-ready",
                loadEvents,
                {
                    once: true
                }
            );
        }
    }


    window.loadCalendar =
        loadEvents;

    start();

})();
