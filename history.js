window.app = {
  requireDb(messageElementId = "message") {
    if (window.db) return true;
    const el = document.getElementById(messageElementId);
    if (el) {
      el.className = "error";
      el.textContent = window.CONFIG_ERROR || "Database connection is not configured.";
    }
    return false;
  },

  money(value) {
    const number = Number(value || 0);
    return `${number > 0 ? "+" : ""}${number.toLocaleString()}`;
  },

  scoreClass(value) {
    const number = Number(value || 0);
    return number > 0 ? "positive" : number < 0 ? "negative" : "zero";
  },

  formatDate(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" })
      .format(new Date(`${value}T00:00:00`));
  },

  formatDateTime(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      .format(new Date(value));
  },

  setMessage(id, text, kind = "notice") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = kind;
    el.classList.remove("hidden");
  },

  clearMessage(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  },

  setActiveNav() {
    const file = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("nav a").forEach(a => {
      const href = a.getAttribute("href");
      if (href === file || (file === "" && href === "index.html")) a.classList.add("active");
    });
  }
};

document.addEventListener("DOMContentLoaded", () => window.app.setActiveNav());
