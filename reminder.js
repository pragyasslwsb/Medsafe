(function () {
  const KEY = "medsafe_reminders_v2";
  const listEl = document.getElementById("reminder-list");
  const alertsEl = document.getElementById("reminder-alerts");
  const form = document.getElementById("reminder-form");
  const errorEl = document.getElementById("rm-error");
  const dateEl = document.getElementById("rm-date");
  if (!listEl || !alertsEl || !form || !dateEl) return;

  const GRACE = 2 * 60 * 1000; // ring only if we are within 2 minutes of the time

  const pad = (n) => String(n).padStart(2, "0");

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function addDay(ts) {
    const d = new Date(ts);
    d.setDate(d.getDate() + 1);
    return d.getTime();
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(reminders));
    } catch (e) {}
  }

  let reminders = load();
  let leftEls = {};

  // ---------- Text helpers ----------
  function formatLeft(ms) {
    if (ms < 0) ms = 0;
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return (d ? d + "d " : "") + pad(h) + ":" + pad(m) + ":" + pad(sec);
  }

  function formatWhen(r) {
    const d = new Date(r.nextDue);
    const day = d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    return day + " at " + pad(d.getHours()) + ":" + pad(d.getMinutes()) +
      (r.repeat === "daily" ? ", repeats every day" : "");
  }

  function leftText(r, now) {
    if (!r.enabled) return "Paused";
    if (r.snoozeUntil) return "Snoozed, rings in " + formatLeft(r.snoozeUntil - now);
    if (r.status === "done") return "Done";
    if (r.status === "missed") return "Missed";
    return "Time left: " + formatLeft(r.nextDue - now);
  }

  function updateCountdowns() {
    const now = Date.now();
    reminders.forEach(function (r) {
      if (leftEls[r.id]) leftEls[r.id].textContent = leftText(r, now);
    });
  }

  // ---------- Show the list ----------
  function render() {
    listEl.innerHTML = "";
    leftEls = {};

    if (!reminders.length) {
      const empty = document.createElement("li");
      empty.className = "rm-empty";
      empty.textContent = "No reminders yet. Add your first medicine above.";
      listEl.appendChild(empty);
      return;
    }

    reminders.forEach(function (r) {
      const li = document.createElement("li");
      li.className = "rm-item" + (r.enabled ? "" : " rm-off");

      const main = document.createElement("div");
      main.className = "rm-main";

      const info = document.createElement("div");
      info.className = "rm-info";
      info.textContent = r.name + (r.dose ? " (" + r.dose + ")" : "");

      const when = document.createElement("div");
      when.className = "rm-when";
      when.textContent = formatWhen(r);

      const left = document.createElement("div");
      left.className = "rm-left";
      leftEls[r.id] = left;

      main.append(info, when, left);

      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = r.enabled;
      toggle.setAttribute("aria-label", "Turn reminder on or off for " + r.name);
      toggle.addEventListener("change", function () {
        r.enabled = toggle.checked;
        save();
        render();
        updateCountdowns();
      });

      const del = document.createElement("button");
      del.type = "button";
      del.className = "rm-delete";
      del.textContent = "Delete";
      del.addEventListener("click", function () {
        reminders = reminders.filter(function (x) {
          return x.id !== r.id;
        });
        save();
        render();
        updateCountdowns();
      });

      li.append(main, toggle, del);
      listEl.appendChild(li);
    });

    updateCountdowns();
  }

  // ---------- Alert when it is time ----------
  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      osc.frequency.value = 880;
      osc.connect(ctx.destination);
      osc.start();
      setTimeout(function () {
        osc.stop();
        ctx.close();
      }, 400);
    } catch (e) {}
  }

  function showAlert(r) {
    const text = "Time to take " + r.name + (r.dose ? " (" + r.dose + ")" : "") + ".";

    const box = document.createElement("div");
    box.className = "rm-alert";

    const msg = document.createElement("p");
    msg.textContent = text;

    const taken = document.createElement("button");
    taken.type = "button";
    taken.textContent = "Taken";
    taken.addEventListener("click", function () {
      box.remove();
    });

    const snooze = document.createElement("button");
    snooze.type = "button";
    snooze.className = "rm-secondary";
    snooze.textContent = "Snooze 10 min";
    snooze.addEventListener("click", function () {
      r.snoozeUntil = Date.now() + 10 * 60 * 1000;
      save();
      box.remove();
      render();
    });

    box.append(msg, taken, snooze);
    alertsEl.appendChild(box);

    beep();

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("MedSafe reminder", { body: text });
      } catch (e) {}
    }
  }

  // ---------- Runs every second: rings alerts and updates the timers ----------
  function tick() {
    const now = Date.now();
    let changed = false;

    reminders.forEach(function (r) {
      if (!r.enabled) return;

      if (r.snoozeUntil) {
        if (now >= r.snoozeUntil) {
          r.snoozeUntil = null;
          changed = true;
          showAlert(r);
        }
        return;
      }

      if (r.status !== "upcoming") return;

      if (now >= r.nextDue) {
        const late = now - r.nextDue;
        if (late <= GRACE) showAlert(r);

        if (r.repeat === "daily") {
          while (r.nextDue <= now) r.nextDue = addDay(r.nextDue);
        } else {
          r.status = late <= GRACE ? "done" : "missed";
        }
        changed = true;
      }
    });

    if (changed) {
      save();
      render();
    } else {
      updateCountdowns();
    }
  }

  // ---------- Add a new reminder ----------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorEl.textContent = "";

    const name = document.getElementById("rm-name").value.trim();
    const dose = document.getElementById("rm-dose").value.trim();
    const date = dateEl.value;
    const time = document.getElementById("rm-time").value;
    const repeat = document.getElementById("rm-repeat").value;

    if (!name || !date || !time) {
      errorEl.textContent = "Please fill the medicine name, date and time.";
      return;
    }

    let due = new Date(date + "T" + time).getTime();
    if (isNaN(due)) {
      errorEl.textContent = "That date or time is not valid.";
      return;
    }

    const now = Date.now();
    if (repeat === "once" && due <= now) {
      errorEl.textContent = "That time has already passed. Choose a time in the future.";
      return;
    }
    if (repeat === "daily") {
      while (due <= now) due = addDay(due);
    }

    reminders.push({
      id: Date.now(),
      name: name,
      dose: dose,
      nextDue: due,
      repeat: repeat,
      enabled: true,
      status: "upcoming",
      snoozeUntil: null,
    });
    reminders.sort(function (a, b) {
      return a.nextDue - b.nextDue;
    });

    save();
    render();
    form.reset();
    dateEl.value = todayStr();

    // Ask once for permission to show browser notifications
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  });

  dateEl.min = todayStr();
  dateEl.value = todayStr();
  render();
  setInterval(tick, 1000);
  tick();
})();
