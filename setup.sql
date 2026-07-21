document.addEventListener("DOMContentLoaded", async () => {
  if (!app.requireDb()) return;
  await Promise.all([loadMatches(), loadSettlements()]);
});

async function loadMatches() {
  const { data, error } = await db
    .from("submissions")
    .select("id, match_date, net_score, approved_at, notes, players(name)")
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(100);
  const body = document.getElementById("matches-body");
  if (error) return body.innerHTML = `<tr><td colspan="4" class="negative">${escapeHtml(error.message)}</td></tr>`;
  body.innerHTML = data?.length ? data.map(row => `
    <tr>
      <td>${app.formatDate(row.match_date)}</td>
      <td>${escapeHtml(row.players?.name || "Unknown")}</td>
      <td class="right ${app.scoreClass(row.net_score)}">${app.money(row.net_score)}</td>
      <td>${escapeHtml(row.notes || "")}</td>
    </tr>`).join("") : `<tr><td colspan="4" class="muted">No approved results yet.</td></tr>`;
}

async function loadSettlements() {
  const { data, error } = await db
    .from("settlements")
    .select("id, cutoff_at, note, settlement_payments(amount, payer:players!settlement_payments_payer_player_id_fkey(name), payee:players!settlement_payments_payee_player_id_fkey(name))")
    .order("cutoff_at", { ascending: false })
    .limit(20);
  const container = document.getElementById("settlements-list");
  if (error) return container.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
  if (!data?.length) return container.innerHTML = `<p class="muted">No resets have been completed.</p>`;
  container.innerHTML = data.map(s => `
    <div class="card">
      <strong>${app.formatDateTime(s.cutoff_at)}</strong>
      ${s.note ? `<p>${escapeHtml(s.note)}</p>` : ""}
      <ul>${(s.settlement_payments || []).map(p => `<li>${escapeHtml(p.payer?.name)} pays ${escapeHtml(p.payee?.name)} <strong>${Number(p.amount).toLocaleString()}</strong></li>`).join("") || "<li>No payments needed.</li>"}</ul>
    </div>`).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
}
