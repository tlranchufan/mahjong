let statsPlayers = [];

document.addEventListener("DOMContentLoaded", async () => {
  const playerSelect = document.getElementById("stats-player-id");
  playerSelect.addEventListener("change", () => loadPlayerStats(playerSelect.value));

  if (!app.requireDb()) return;
  await loadStatsPlayers();
});

async function loadStatsPlayers() {
  const playerSelect = document.getElementById("stats-player-id");
  const { data, error } = await db
    .from("players")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    playerSelect.innerHTML = `<option value="">Unable to load players</option>`;
    return app.setMessage("message", error.message, "error");
  }

  statsPlayers = data || [];
  if (!statsPlayers.length) {
    playerSelect.innerHTML = `<option value="">No active players</option>`;
    document.getElementById("stats-content").classList.add("hidden");
    return;
  }

  playerSelect.innerHTML = statsPlayers
    .map(player => `<option value="${player.id}">${escapeHtml(player.name)}</option>`)
    .join("");

  const requestedPlayer = new URLSearchParams(window.location.search).get("player");
  const selectedPlayer = statsPlayers.some(player => player.id === requestedPlayer)
    ? requestedPlayer
    : statsPlayers[0].id;

  playerSelect.value = selectedPlayer;
  await loadPlayerStats(selectedPlayer);
}

async function loadPlayerStats(playerId) {
  if (!playerId) {
    document.getElementById("stats-content").classList.add("hidden");
    return;
  }

  app.clearMessage("message");
  document.getElementById("stats-content").classList.remove("hidden");
  document.getElementById("stats-results-body").innerHTML = `<tr><td colspan="5">Loading…</td></tr>`;

  const player = statsPlayers.find(item => item.id === playerId);
  document.getElementById("results-heading").textContent = player
    ? `${player.name}'s historical results`
    : "Historical results";

  const url = new URL(window.location.href);
  url.searchParams.set("player", playerId);
  window.history.replaceState({}, "", url);

  const { data, error } = await db
    .from("submissions")
    .select("id, match_date, start_value, end_value, net_score, notes, approved_at")
    .eq("status", "approved")
    .eq("player_id", playerId)
    .order("match_date", { ascending: false })
    .order("approved_at", { ascending: false });

  if (error) {
    document.getElementById("stats-results-body").innerHTML = `<tr><td colspan="5" class="negative">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  renderStats(data || []);
}

function renderStats(results) {
  const games = results.length;
  const nets = results.map(row => Number(row.net_score || 0));
  const total = nets.reduce((sum, value) => sum + value, 0);
  const average = games ? total / games : 0;
  const best = games ? Math.max(...nets) : null;
  const worst = games ? Math.min(...nets) : null;

  const gamesElement = document.getElementById("games-played");
  const averageElement = document.getElementById("average-net");
  const totalElement = document.getElementById("total-net");
  const bestWorstElement = document.getElementById("best-worst");

  gamesElement.textContent = games.toLocaleString();
  averageElement.textContent = formatAverage(average);
  averageElement.className = app.scoreClass(average);
  totalElement.textContent = app.money(total);
  totalElement.className = app.scoreClass(total);
  bestWorstElement.textContent = games ? `${app.money(best)} / ${app.money(worst)}` : "—";

  const body = document.getElementById("stats-results-body");
  body.innerHTML = games
    ? results.map(row => `
      <tr>
        <td>${app.formatDate(row.match_date)}</td>
        <td class="right">${Number(row.start_value || 0).toLocaleString()}</td>
        <td class="right">${Number(row.end_value || 0).toLocaleString()}</td>
        <td class="right ${app.scoreClass(row.net_score)}">${app.money(row.net_score)}</td>
        <td>${escapeHtml(row.notes || "")}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="muted">This player has no approved results.</td></tr>`;
}

function formatAverage(value) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
}
