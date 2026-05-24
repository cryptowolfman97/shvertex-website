/**
 * SH Vertex — Site Settings Loader
 * Fetches site_settings from Supabase and replaces all
 * elements with data-shv-apk-link or data-shv-apk-href attributes.
 * Include this AFTER shv-supabase-config.js on every page.
 */
(async function () {
  const CFG = window.SHV_SUPABASE;
  if (!CFG || !CFG.url || !CFG.publishableKey) return;

  // Default fallback (used before DB responds or on error)
  const FALLBACK_URL = 'https://www.dropbox.com/scl/fi/1rjkt4s8gz9ml5tn2yo9m/shvstore-2-arm64-v8a_armeabi-v7a-debug.apk?rlkey=fnr48tplxzkkzjcdmioks82fi&st=0t7aovzv&dl=1';

  function applyUrl(url) {
    // <a data-shv-apk-link> — sets href
    document.querySelectorAll('[data-shv-apk-link]').forEach(el => {
      el.href = url;
    });
  }

  // Apply fallback immediately so buttons work even before fetch
  applyUrl(FALLBACK_URL);

  try {
    const sb = window.supabase.createClient(CFG.url, CFG.publishableKey);
    const { data, error } = await sb
      .from('site_settings')
      .select('value')
      .eq('key', 'store_apk_url')
      .single();
    if (!error && data && data.value) {
      applyUrl(data.value);
    }
  } catch (e) {
    // Silently fall back to hardcoded URL already applied above
  }
})();
