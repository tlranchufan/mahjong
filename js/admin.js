let currentUser = null;
let currentSettings = null;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("login-form").addEventListener("submit", signIn);
  document.getElementById("signup-button").addEventListener("click", signUp);
  document.getElementById("logout-button").addEventListener("click", signOut);
  document.getElementById("player-form").addEventListener("submit", addPlayer);
  document.getElementById("settings-form").addEventListener("submit", saveSettings);
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
  await Promise.all([loadPending(), loadPlayers(), loadSettings()]);
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
  if (!email || password.length < 6) return app.setMessage("message", "Enter an email and a password of at least 6 characters.", "error");
  const { error } = await db.auth.signUp({ email, password });
  if (error) return app.setMessage("message", error.message, "error");
  app.setMessage("message", "Account created. Check your email if confirmation is enabled, then promote this account using the SQL command in README.md.", "success");
}

async function signOut() { await db.auth.signOut(); }

async function loadPending() {
  const { data, error } = await db
    .from("submissions")
    .select("*, players(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const body = document.getElementById("pending-body");
  if (error) return body.innerHTML = `<tr><td colspan="7" class="negative">${escapeHtml(error.message)}</td></tr>`;
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
  await loadPending();
};

window.editSubmission = async function(id) {
  const { data, error } = await db.from("submissions").select("*").eq("id", id).single();
  if (error) return app.setMessage("message", error.message, "error");
  const fields = ["start_white","start_red","start_blue","start_green","end_white","end_red","end_blue","end_green"];
  const updates = {};
  for (const field of fields) {
    const answer = prompt(`Edit ${field.replaceAll("_", " ")}:`, data[field]);
    if (answer === null) return;
    const number = Number(answer);
    if (!Number.isInteger(number) || number < 0) return alert("Chip counts must be non-negative whole numbers.");
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
  if (error) return body.innerHTML = `<tr><td colspan="3" class="negative">${escapeHtml(error.message)}</td></tr>`;
  body.innerHTML = data?.map(p => `
    <tr><td>${escapeHtml(p.name)}</td><td>${p.active ? "Active" : "Inactive"}</td>
    <td><button class="small ${p.active ? "danger" : ""}" onclick="togglePlayer('${p.id}', ${!p.active})">${p.active ? "Deactivate" : "Reactivate"}</button></td></tr>`).join("") || "";
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
  ["white","red","blue","green"].forEach(color => {
    document.getElementById(`default-${color}`).value = data[`default_${color}`];
  });
}

async function saveSettings(event) {
  event.preventDefault();
  const payload = {};
  ["white","red","blue","green"].forEach(color => {
    payload[`default_${color}`] = Number(document.getElementById(`default-${color}`).value);
  });
  const { error } = await db.from("league_settings").update(payload).eq("id", 1);
  if (error) return app.setMessage("message", error.message, "error");
  app.setMessage("message", "Default allocation updated.", "success");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
}
