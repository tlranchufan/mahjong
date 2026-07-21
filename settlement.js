let settings;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("match-date").value = new Date().toISOString().slice(0, 10);
  document.querySelectorAll("input[type=number]").forEach(input => input.addEventListener("input", calculate));
  document.getElementById("result-form").addEventListener("submit", submitResult);
  if (!app.requireDb()) return;
  await Promise.all([loadPlayers(), loadSettings()]);
  calculate();
});

async function loadPlayers() {
  const { data, error } = await db.from("players").select("id, name").eq("active", true).order("name");
  if (error) return app.setMessage("message", error.message, "error");
  const select = document.getElementById("player-id");
  select.innerHTML = `<option value="">Choose your name</option>` +
    (data || []).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
}

async function loadSettings() {
  const { data, error } = await db.from("league_settings").select("*").eq("id", 1).single();
  if (error) return app.setMessage("message", error.message, "error");
  settings = data;
  const map = {
    "start-white": data.default_white,
    "start-red": data.default_red,
    "start-blue": data.default_blue,
    "start-green": data.default_green
  };
  Object.entries(map).forEach(([id, value]) => document.getElementById(id).value = value);
  document.querySelectorAll("[data-white-value]").forEach(el => el.textContent = data.white_value);
  document.querySelectorAll("[data-red-value]").forEach(el => el.textContent = data.red_value);
  document.querySelectorAll("[data-blue-value]").forEach(el => el.textContent = data.blue_value);
  document.querySelectorAll("[data-green-value]").forEach(el => el.textContent = data.green_value);
}

function value(prefix) {
  if (!settings) return 0;
  return Number(document.getElementById(`${prefix}-white`).value || 0) * settings.white_value +
    Number(document.getElementById(`${prefix}-red`).value || 0) * settings.red_value +
    Number(document.getElementById(`${prefix}-blue`).value || 0) * settings.blue_value +
    Number(document.getElementById(`${prefix}-green`).value || 0) * settings.green_value;
}

function calculate() {
  const start = value("start");
  const end = value("end");
  const net = end - start;
  document.getElementById("start-total").textContent = start.toLocaleString();
  document.getElementById("end-total").textContent = end.toLocaleString();
  document.getElementById("net-total").textContent = app.money(net);
  document.getElementById("net-total").className = app.scoreClass(net);
}

async function submitResult(event) {
  event.preventDefault();
  app.clearMessage("message");
  if (!app.requireDb()) return;

  const button = document.getElementById("submit-button");
  button.disabled = true;
  button.textContent = "Submitting…";

  const payload = {
    player_id: document.getElementById("player-id").value,
    match_date: document.getElementById("match-date").value,
    start_white: Number(document.getElementById("start-white").value),
    start_red: Number(document.getElementById("start-red").value),
    start_blue: Number(document.getElementById("start-blue").value),
    start_green: Number(document.getElementById("start-green").value),
    end_white: Number(document.getElementById("end-white").value),
    end_red: Number(document.getElementById("end-red").value),
    end_blue: Number(document.getElementById("end-blue").value),
    end_green: Number(document.getElementById("end-green").value),
    notes: document.getElementById("notes").value.trim() || null
  };

  const { error } = await db.from("submissions").insert(payload);
  button.disabled = false;
  button.textContent = "Submit for approval";

  if (error) return app.setMessage("message", error.message, "error");

  app.setMessage("message", "Submitted successfully. It will appear on the leaderboard after an administrator approves it.", "success");
  document.getElementById("end-white").value = 0;
  document.getElementById("end-red").value = 0;
  document.getElementById("end-blue").value = 0;
  document.getElementById("end-green").value = 0;
  document.getElementById("notes").value = "";
  calculate();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
}
