/**
 * SH Vertex — Site Settings Loader v3
 * Uses plain fetch() to Supabase REST API — no JS library dependency,
 * no timing issues, always works.
 */
(async function () {
  const SUPABASE_URL  = 'https://ovdxetyadfsxehwnbyuz.supabase.co';
  const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92ZHhldHlhZGZzeGVod25ieXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTg3ODUsImV4cCI6MjA5MTg3NDc4NX0.LBPevOt31jpJaQNK7n_5GQsD-H40ndFVmi7dNeJt5tA';
  const FALLBACK_URL  = 'https://github.com/cryptowolfman97/shvertex-website/releases/download/v1.0/app-debug.apk';

  function applyUrl(url) {
    window.SHV_APK_URL = url;
    document.querySelectorAll('[data-shv-apk-link]').forEach(el => {
      el.href = url;
    });
  }

  // Apply fallback immediately — buttons work instantly on page load
  applyUrl(FALLBACK_URL);

  // Then fetch the latest URL from Supabase via plain REST — no library needed
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/site_settings?key=eq.store_apk_url&select=value`,
      {
        headers: {
          'apikey':        ANON_KEY,
          'Authorization': 'Bearer ' + ANON_KEY,
          'Content-Type':  'application/json'
        }
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && data[0].value) {
        applyUrl(data[0].value);
      }
    }
  } catch (e) {
    // Fallback already applied above — silently continue
  }
})();
