(() => {
  const cfg = window.APP_CONFIG || {};
  const leagueName = "Harrison Mahjong League";

  // Keep the visible site name consistent even if config.js still contains an older name.
  document.querySelectorAll("[data-league-name]").forEach((el) => {
    el.textContent = leagueName;
  });

  // Keep browser-tab titles consistent as well.
  if (document.title.includes("|")) {
    const pageName = document.title.split("|")[0].trim();
    document.title = `${pageName} | ${leagueName}`;
  } else if (/mahjong league/i.test(document.title)) {
    document.title = leagueName;
  }

  const missing = !cfg.supabaseUrl || !cfg.supabasePublishableKey ||
    cfg.supabaseUrl.includes("PASTE_") || cfg.supabasePublishableKey.includes("PASTE_");

  if (missing) {
    window.db = null;
    window.CONFIG_ERROR = "Supabase is not connected yet. Edit js/config.js and add your Project URL and publishable key.";
    return;
  }

  window.db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
})();
