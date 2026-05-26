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
  const FALLBACK_URL = 'https://drive.google.com/file/d/1ORxTBBsRAQzxchyBT7_ZcKMn0jvP9oVu/view?usp=sharing';

  function applyUrl(url) {
    // Store on window so guide modal can read it without a separate Supabase call
    window.SHV_APK_URL = url;
    // <a data-shv-apk-link> — sets href
    document.querySelectorAll('[data-shv-apk-link]').forEach(el => {
      el.href = url;
    });
  }

  // Apply fallback immediately so buttons work even before fetch
  applyUrl(FALLBACK_URL);

  try {
    const sb = window.supabase.createClient(CFG.url, CFG.anonKey);
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
