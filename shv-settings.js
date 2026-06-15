/**
 * SH Vertex — Site Settings Loader v3
 * Plain fetch() to Supabase REST — no library dependency, no timing issues.
 */
(async function () {
  const SUPABASE_URL  = 'https://ovdxetyadfsxehwnbyuz.supabase.co';
  const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92ZHhldHlhZGZzeGVod25ieXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTg3ODUsImV4cCI6MjA5MTg3NDc4NX0.LBPevOt31jpJaQNK7n_5GQsD-H40ndFVmi7dNeJt5tA';
  const FALLBACK_URL  = 'https://github.com/cryptowolfman97/shvertex-website/releases/download/v1.0/app-debug.apk';

  function applyUrl(url) {
    window.SHV_APK_URL = url;
    document.querySelectorAll('[data-shv-apk-link]').forEach(el => { el.href = url; });
  }

  applyUrl(FALLBACK_URL);

  try {
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/site_settings?key=eq.store_apk_url&select=value',
      { headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && data[0].value) applyUrl(data[0].value);
    }
  } catch (e) {}
})();
