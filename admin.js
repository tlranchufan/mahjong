document.addEventListener("DOMContentLoaded", loadLeaderboard);

async function loadLeaderboard() {
  if (!app.requireDb()) return;
  const body = document.getElementById("leaderboard-body");
  body.innerHTML = `<tr><td colspan="4">Loading…</td></tr>`;

  const { data, error } = await db
    .from("current_leaderboard")
    .select("player_id, player_name, balance, last_played")
    .order("balance", { ascending: false })
    .order("player_name", { ascending: true });

  if (error) {
    app.setMessage("message", error.message, "error");
    body.innerHTML = "";
    return;
  }

  if (!data?.length) {
    body.innerHTML = `<tr><td colspan="4" class="muted">No active players yet.</td></tr>`;
    return;
  }

  body.innerHTML = data.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(row.player_name)}</strong></td>
      <td class="right ${app.scoreClass(row.balance)}">${app.money(row.balance)}</td>
      <td>${row.last_played ? app.formatDate(row.last_played) : "—"}</td>
    </tr>
  `).join("");

  const total = data.reduce((sum, row) => sum + Number(row.balance || 0), 0);
  document.getElementById("player-count").textContent = data.length;
  document.getElementById("total-balance").textContent = app.money(total);
  document.getElementById("total-balance").className = app.scoreClass(total);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
}
