(() => {
  const cfg = window.APP_CONFIG || {};
  document.querySelectorAll("[data-league-name]").forEach(el => {
    el.textContent = cfg.leagueName || "Mahjong League";
  });

  const missing = !cfg.supabaseUrl || !cfg.supabasePublishableKey ||
    cfg.supabaseUrl.includes("PASTE_") || cfg.supabasePublishableKey.includes("PASTE_");

  if (missing) {
    window.db = null;
    window.CONFIG_ERROR = "Supabase is not connected yet. Edit js/config.js and add your Project URL and publishable key.";
    return;
  }

  window.db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
})();
