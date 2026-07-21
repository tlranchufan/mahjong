let balances = [];
let payments = [];
let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("refresh-button").addEventListener("click", loadSettlement);
  document.getElementById("finalize-button").addEventListener("click", finalizeSettlement);
  if (!app.requireDb()) return;
  const { data } = await db.auth.getSession();
  currentUser = data.session?.user || null;
  await loadSettlement();
  await checkAdmin();
});

async function checkAdmin() {
  if (!currentUser) return;
  const { data } = await db.from("profiles").select("is_admin").eq("id", currentUser.id).single();
  if (data?.is_admin) document.getElementById("admin-controls").classList.remove("hidden");
}

async function loadSettlement() {
  const { data, error } = await db.from("current_leaderboard").select("player_id, player_name, balance").order("balance", { ascending: false });
  if (error) return app.setMessage("message", error.message, "error");
  balances = (data || []).map(x => ({ ...x, balance: Number(x.balance || 0) }));
  payments = calculatePayments(balances);
  render();
}

function calculatePayments(rows) {
  const creditors = rows.filter(x => x.balance > 0).map(x => ({ ...x, remaining: x.balance })).sort((a,b) => b.remaining - a.remaining);
  const debtors = rows.filter(x => x.balance < 0).map(x => ({ ...x, remaining: -x.balance })).sort((a,b) => b.remaining - a.remaining);
  const result = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].remaining, creditors[j].remaining);
    if (amount > 0) result.push({
      payer_id: debtors[i].player_id,
      payer_name: debtors[i].player_name,
      payee_id: creditors[j].player_id,
      payee_name: creditors[j].player_name,
      amount
    });
    debtors[i].remaining -= amount;
    creditors[j].remaining -= amount;
    if (debtors[i].remaining === 0) i++;
    if (creditors[j].remaining === 0) j++;
  }
  return result;
}

function render() {
  document.getElementById("balances-body").innerHTML = balances.map(row => `
    <tr><td>${escapeHtml(row.player_name)}</td><td class="right ${app.scoreClass(row.balance)}">${app.money(row.balance)}</td></tr>
  `).join("") || `<tr><td colspan="2" class="muted">No players.</td></tr>`;

  document.getElementById("payments-body").innerHTML = payments.map(p => `
    <tr><td>${escapeHtml(p.payer_name)}</td><td>${escapeHtml(p.payee_name)}</td><td class="right"><strong>${p.amount.toLocaleString()}</strong></td></tr>
  `).join("") || `<tr><td colspan="3" class="muted">No payments are needed.</td></tr>`;

  const total = balances.reduce((sum, row) => sum + row.balance, 0);
  const balanced = Math.abs(total) < 0.000001;
  document.getElementById("balance-check").textContent = balanced
    ? "Balances add to zero. The reset can be finalized."
    : `Balances do not add to zero (${app.money(total)}). Check that every match has all players' results.`;
  document.getElementById("balance-check").className = balanced ? "success" : "error";
  document.getElementById("finalize-button").disabled = !balanced;
}

async function finalizeSettlement() {
  if (!currentUser) return app.setMessage("message", "Sign in on the Admin page first.", "error");
  const note = document.getElementById("settlement-note").value.trim() || null;
  if (!confirm("Finalize this reset? The current leaderboard will return to zero and this cannot be edited from the website.")) return;
  const rpcPayments = payments.map(p => ({ payer_id: p.payer_id, payee_id: p.payee_id, amount: p.amount }));
  const { error } = await db.rpc("finalize_settlement", { p_note: note, p_payments: rpcPayments });
  if (error) return app.setMessage("message", error.message, "error");
  app.setMessage("message", "Settlement saved. The current leaderboard has been reset.", "success");
  document.getElementById("settlement-note").value = "";
  await loadSettlement();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
}
