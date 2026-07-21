let currentUser = null;
let currentSettings = null;
let approvedResultCount = 0;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("login-form").addEventListener("submit", signIn);
  document.getElementById("signup-button").addEventListener("click", signUp);
  document.getElementById("logout-button").addEventListener("click", signOut);
  document.getElementById("admin-logout-button").addEventListener("click", signOut);
  document.getElementById("player-form").addEventListener("submit", addPlayer);
  document.getElementById("settings-form").addEventListener("submit", saveSettings);
  document.getElementById("purge-confirm").addEventListener("input", updatePurgeButton);
  document.getElementById("purge-approved-button").addEventListener("click", purgeApprovedResults);

  if (!app.requireDb()) return;

  const { data } = await db.auth.getSession();
  await handleSession(data.session);
  db.auth.onAuthStateChange((_event, session) => setTimeout(() => handleSession(session), 0));
});

async function handleSession(session) {
  currentUser = session?.user || null;
  document.getElementById("auth-card").classList.toggle("hidden", !!currentUser);
  document.getElementById("admin-area").classList.add("hidden");
  document.getElementById("not-admin").classList.add("hidden");
  if (!currentUser) return;

  const { data, error } = await db.from("profiles").select("is_admin").eq("id", currentUser.id).single();
  if (error || !data?.is_admin) {
    document.getElementById("not-admin").classList.remove("hidden");
    document.getElementById("signed-in-email").textContent = currentUser.email;
    return;
  }

  document.getElementById("admin-area").classList.remove("hidden");
  document.getElementById("admin-email").textContent = currentUser.email;
  await Promise.all([loadPending(), loadApprovedResults(), loadPlayers(), loadSettings(), loadApprovedResultCount()]);
}

async function signIn(event) {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) app.setMessage("message", error.message, "error");
}

async function signUp() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!email || password.length < 6) {
    return app.setMessage("message", "Enter an email and a password of at least 6 characters.", "error");
  }
  const { error } = await db.auth.signUp({ email, password });
  if (error) return app.setMessage("message", error.message, "error");
  app.setMessage("message", "Account created. Check your email if confirmation is enabled, then promote this account using the SQL command in README.md.", "success");
}

async function signOut() {
  await db.auth.signOut();
}

async function loadPending() {
  const { data, error } = await db
    .from("submissions")
    .select("*, players(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const body = document.getElementById("pending-body");
  if (error) {
    body.innerHTML = `<tr><td colspan="7" class="negative">${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  body.innerHTML = data?.length ? data.map(row => `
    <tr>
      <td>${escapeHtml(row.players?.name)}</td>
      <td>${app.formatDate(row.match_date)}</td>
      <td class="right">${row.start_value}</td>
      <td class="right">${row.end_value}</td>
      <td class="right ${app.scoreClass(row.net_score)}">${app.money(row.net_score)}</td>
      <td>${escapeHtml(row.notes || "")}</td>
      <td><div class="actions">
        <button class="small" onclick="reviewSubmission('${row.id}', 'approved')">Approve</button>
        <button class="small secondary" onclick="editSubmission('${row.id}')">Edit</button>
        <button class="small danger" onclick="reviewSubmission('${row.id}', 'rejected')">Reject</button>
      </div></td>
    </tr>`).join("") : `<tr><td colspan="7" class="muted">No submissions are waiting.</td></tr>`;
}

window.reviewSubmission = async function(id, status) {
  const payload = {
    status,
    reviewed_by: currentUser.id,
    reviewed_at: new Date().toISOString(),
    approved_at: status === "approved" ? new Date().toISOString() : null
  };
  const { error } = await db.from("submissions").update(payload).eq("id", id);
  if (error) return app.setMessage("message", error.message, "error");
  await Promise.all([loadPending(), loadApprovedResults(), loadApprovedResultCount()]);
};

async function loadApprovedResults() {
  const body = document.getElementById("approved-body");
  if (!body) return;

  const { data, error } = await db
    .from("submissions")
    .select("id, match_date, start_value, end_value, net_score, notes, approved_at, players(name)")
    .eq("status", "approved")
    .order("match_date", { ascending: false })
    .order("approved_at", { ascending: false });

  if (error) {
    body.innerHTML = `<tr><td colspan="7" class="negative">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  body.innerHTML = data?.length ? data.map(row => `
    <tr>
      <td>${escapeHtml(row.players?.name || "Unknown player")}</td>
      <td>${app.formatDate(row.match_date)}</td>
      <td class="right">${row.start_value}</td>
      <td class="right">${row.end_value}</td>
      <td class="right ${app.scoreClass(row.net_score)}">${app.money(row.net_score)}</td>
      <td>${escapeHtml(row.notes || "")}</td>
      <td><button
        class="small danger delete-approved-result"
        type="button"
        data-id="${escapeHtml(row.id)}"
        data-player="${escapeHtml(row.players?.name || "Unknown player")}"
        data-date="${escapeHtml(row.match_date)}">Delete</button></td>
    </tr>`).join("") : `<tr><td colspan="7" class="muted">No approved results.</td></tr>`;

  body.querySelectorAll(".delete-approved-result").forEach(button => {
    button.addEventListener("click", () => deleteApprovedResult(
      button.dataset.id,
      button.dataset.player,
      button.dataset.date,
      button
    ));
  });
}

async function deleteApprovedResult(id, playerName, matchDate, button) {
  if (!currentUser || !id) return;

  const warning = `Permanently delete ${playerName}'s approved result from ${app.formatDate(matchDate)}? This will immediately change the leaderboard, History, and Stats and cannot be undone.`;
  if (!confirm(warning)) return;

  button.disabled = true;
  button.textContent = "Deleting…";

  const { error } = await db
    .from("submissions")
    .delete()
    .eq("id", id)
    .eq("status", "approved");

  if (error) {
    button.disabled = false;
    button.textContent = "Delete";
    return app.setMessage("message", error.message, "error");
  }

  app.setMessage("message", `${playerName}'s approved result was permanently deleted.`, "success");
  await Promise.all([loadApprovedResults(), loadApprovedResultCount()]);
}

window.editSubmission = async function(id) {
  const { data, error } = await db.from("submissions").select("*").eq("id", id).single();
  if (error) return app.setMessage("message", error.message, "error");
  const fields = ["start_white", "start_red", "start_blue", "start_green", "end_white", "end_red", "end_blue", "end_green"];
  const updates = {};
  for (const field of fields) {
    const answer = prompt(`Edit ${field.replaceAll("_", " ")}:`, data[field]);
    if (answer === null) return;
    const number = Number(answer);
    if (!Number.isInteger(number) || number < 0) {
      alert("Chip counts must be non-negative whole numbers.");
      return;
    }
    updates[field] = number;
  }
  const { error: updateError } = await db.from("submissions").update(updates).eq("id", id);
  if (updateError) return app.setMessage("message", updateError.message, "error");
  await loadPending();
};

async function addPlayer(event) {
  event.preventDefault();
  const name = document.getElementById("new-player-name").value.trim();
  if (!name) return;
  const { error } = await db.from("players").insert({ name });
  if (error) return app.setMessage("message", error.message, "error");
  document.getElementById("new-player-name").value = "";
  await loadPlayers();
}

async function loadPlayers() {
  const { data, error } = await db.from("players").select("id, name, active").order("name");
  const body = document.getElementById("players-body");
  if (error) {
    body.innerHTML = `<tr><td colspan="3" class="negative">${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  body.innerHTML = data?.map(player => `
    <tr>
      <td>${escapeHtml(player.name)}</td>
      <td>${player.active ? "Active" : "Inactive"}</td>
      <td><button class="small ${player.active ? "danger" : ""}" onclick="togglePlayer('${player.id}', ${!player.active})">${player.active ? "Deactivate" : "Reactivate"}</button></td>
    </tr>`).join("") || "";
}

window.togglePlayer = async function(id, active) {
  const { error } = await db.from("players").update({ active }).eq("id", id);
  if (error) return app.setMessage("message", error.message, "error");
  await loadPlayers();
};

async function loadSettings() {
  const { data, error } = await db.from("league_settings").select("*").eq("id", 1).single();
  if (error) return app.setMessage("message", error.message, "error");
  currentSettings = data;
  ["white", "red", "blue", "green"].forEach(color => {
    document.getElementById(`default-${color}`).value = data[`default_${color}`];
  });
}

async function saveSettings(event) {
  event.preventDefault();
  const payload = {};
  ["white", "red", "blue", "green"].forEach(color => {
    payload[`default_${color}`] = Number(document.getElementById(`default-${color}`).value);
  });
  const { error } = await db.from("league_settings").update(payload).eq("id", 1);
  if (error) return app.setMessage("message", error.message, "error");
  app.setMessage("message", "Default allocation updated.", "success");
}

async function loadApprovedResultCount() {
  const countElement = document.getElementById("approved-result-count");
  const { count, error } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  if (error) {
    approvedResultCount = 0;
    countElement.className = "error";
    countElement.textContent = `Unable to count approved results: ${error.message}`;
    updatePurgeButton();
    return;
  }

  approvedResultCount = Number(count || 0);
  countElement.className = "notice";
  countElement.textContent = approvedResultCount === 1
    ? "There is 1 approved result available to purge."
    : `There are ${approvedResultCount.toLocaleString()} approved results available to purge.`;
  updatePurgeButton();
}

function updatePurgeButton() {
  const input = document.getElementById("purge-confirm");
  const button = document.getElementById("purge-approved-button");
  button.disabled = input.value.trim() !== "PURGE" || approvedResultCount === 0;
}

async function purgeApprovedResults() {
  if (!currentUser || approvedResultCount === 0) return;

  const confirmation = document.getElementById("purge-confirm").value.trim();
  if (confirmation !== "PURGE") return;

  const warning = `Permanently delete ${approvedResultCount.toLocaleString()} approved result${approvedResultCount === 1 ? "" : "s"}? This cannot be undone and will erase the leaderboard, approved-result history, and player statistics.`;
  if (!confirm(warning)) return;

  const button = document.getElementById("purge-approved-button");
  button.disabled = true;
  button.textContent = "Purging…";

  const { error } = await db
    .from("submissions")
    .delete()
    .eq("status", "approved");

  button.textContent = "Purge approved results";

  if (error) {
    updatePurgeButton();
    return app.setMessage("message", error.message, "error");
  }

  document.getElementById("purge-confirm").value = "";
  app.setMessage("message", "All approved results were permanently deleted. Pending and rejected submissions were left unchanged.", "success");
  await Promise.all([loadApprovedResults(), loadApprovedResultCount()]);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
}
