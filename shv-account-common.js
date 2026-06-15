
(function(){
  const body = document.body;
  const progress = document.querySelector('.shv-progress');
  const onScroll = () => {
    const y = window.scrollY || 0;
    if (body) body.classList.toggle('is-scrolled', y > 18);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? (y / h) * 100 : 0;
      progress.style.width = Math.max(0, Math.min(100, p)) + '%';
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const targets = document.querySelectorAll('.shv-reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('shv-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(el => io.observe(el));
  } else {
    targets.forEach(el => el.classList.add('shv-revealed'));
  }
})();

window.shvPortal = (() => {
  let client = null;

  function getConfig() {
    const supplied = window.SHV_SUPABASE || {};
    return {
      url: supplied.url || '',
      publishableKey: supplied.publishableKey || '',
      siteUrl: supplied.siteUrl || window.location.origin,
      storageBucket: supplied.storageBucket || 'app-backups',
      defaultAppCode: supplied.defaultAppCode || 'simplibudget',
      defaultPlan: supplied.defaultPlan || 'Standard'
    };
  }

  function isConfigured() {
    const cfg = getConfig();
    return !!cfg.url && !cfg.url.includes('YOUR-PROJECT-REF') && !!cfg.publishableKey && !cfg.publishableKey.includes('REPLACE_WITH_YOUR_KEY');
  }

  function ensureSupabaseLibrary() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase client library failed to load.');
    }
  }

  function createClient() {
    if (client) return client;
    ensureSupabaseLibrary();
    if (!isConfigured()) return null;
    const cfg = getConfig();
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    });
    return client;
  }

  function requireConfigured() {
    const sb = createClient();
    if (!sb) {
      throw new Error('Supabase is not configured yet. Edit shv-supabase-config.js with your project URL and publishable key first.');
    }
    return sb;
  }

  function pageUrl(fileName) {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/[^/]+$/, fileName);
    url.search = '';
    url.hash = '';
    return url.toString();
  }

  async function exchangeCodeIfPresent() {
    const sb = createClient();
    if (!sb) return { skipped: true };
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) return { skipped: true };
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return { skipped: false, error };
    url.searchParams.delete('code');
    const next = url.pathname + (url.search || '') + (url.hash || '');
    window.history.replaceState({}, document.title, next);
    return { skipped: false, exchanged: true };
  }

  async function getCurrentUser() {
    const sb = createClient();
    if (!sb) return null;
    const { data, error } = await sb.auth.getUser();
    if (error) return null;
    return data.user || null;
  }

  async function signIn(email, password) {
    const sb = requireConfigured();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(displayName, email, password) {
    const sb = requireConfigured();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: pageUrl('dashboard.html')
      }
    });
    if (error) throw error;
    return data;
  }

  async function sendPasswordReset(email) {
    const sb = requireConfigured();
    const { data, error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: pageUrl('update-password.html')
    });
    if (error) throw error;
    return data;
  }

  async function updatePassword(password) {
    const sb = requireConfigured();
    const { data, error } = await sb.auth.updateUser({ password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const sb = createClient();
    if (!sb) return;
    await sb.auth.signOut();
  }

  function fallbackDisplayName(user) {
    const raw = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'SH Vertex Customer';
    return raw.replace(/[._-]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
  }

  async function ensureProfile(user) {
    const sb = requireConfigured();
    const payload = {
      id: user.id,
      email: user.email || null,
      display_name: fallbackDisplayName(user)
    };
    const { data, error } = await sb
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async function fetchDashboardData() {
    const sb = requireConfigured();
    const user = await getCurrentUser();
    if (!user) return { user: null };

    let profile = null;
    try {
      profile = await ensureProfile(user);
    } catch (err) {
      profile = {
        id: user.id,
        email: user.email || null,
        display_name: fallbackDisplayName(user),
        plan: getConfig().defaultPlan,
        created_at: user.created_at || new Date().toISOString()
      };
    }

    const [devicesCountRes, backupsCountRes, devicesRes, backupsRes] = await Promise.all([
      sb.from('devices').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      sb.from('backups').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      sb.from('devices').select('id, app_code, device_name, platform, last_seen_at, created_at').eq('user_id', user.id).order('last_seen_at', { ascending: false, nullsFirst: false }).limit(8),
      sb.from('backups').select('id, app_code, backup_name, created_at, backup_size, is_auto, version').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
    ]);

    const devices = devicesRes.data || [];
    const backups = backupsRes.data || [];
    const appSet = new Set();
    devices.forEach(item => item.app_code && appSet.add(item.app_code));
    backups.forEach(item => item.app_code && appSet.add(item.app_code));

    return {
      user,
      profile,
      devices,
      backups,
      deviceCount: devicesCountRes.count || 0,
      backupCount: backupsCountRes.count || 0,
      appCount: appSet.size,
      deviceError: devicesRes.error || devicesCountRes.error || null,
      backupError: backupsRes.error || backupsCountRes.error || null
    };
  }

  function friendlyError(error) {
    const message = (error && error.message ? error.message : String(error || 'Unknown error')).trim();
    const normalized = message.toLowerCase();
    if (normalized.includes('invalid login credentials')) return 'Incorrect email or password.';
    if (normalized.includes('email not confirmed')) return 'Please confirm your email first, then try signing in again.';
    if (normalized.includes('password should be at least')) return 'Use a stronger password that meets the minimum length requirement.';
    if (normalized.includes('user already registered')) return 'An account with that email already exists.';
    if (normalized.includes('relation') && normalized.includes('does not exist')) return 'The Supabase schema is not installed yet. Run shvertex_supabase_schema.sql in your project first.';
    if (normalized.includes('row-level security')) return 'The database policies are blocking this action. Re-check the SQL policies in the setup file.';
    if (normalized.includes('invalid api key') || normalized.includes('invalid jwt')) return 'Your Supabase URL or publishable key looks incorrect.';
    return message;
  }

  function showToast(el, message, type = 'success') {
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    if (type === 'error') {
      el.style.borderColor = 'rgba(248,113,113,.28)';
      el.style.background = 'rgba(248,113,113,.10)';
      el.style.color = '#fecaca';
    } else if (type === 'info') {
      el.style.borderColor = 'rgba(56,189,248,.25)';
      el.style.background = 'rgba(56,189,248,.10)';
      el.style.color = '#dbeafe';
    } else {
      el.style.borderColor = 'rgba(34,197,94,.22)';
      el.style.background = 'rgba(34,197,94,.08)';
      el.style.color = '#d1fae5';
    }
  }

  function setBusy(button, busy, busyText) {
    if (!button) return;
    if (busy) {
      if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
      button.textContent = busyText || 'Please wait...';
      button.disabled = true;
      button.style.opacity = '0.72';
      button.style.cursor = 'wait';
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
      button.style.opacity = '';
      button.style.cursor = '';
    }
  }

  function formatDate(dateLike) {
    if (!dateLike) return '—';
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateTime(dateLike) {
    if (!dateLike) return '—';
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function formatBytes(bytes) {
    const num = Number(bytes || 0);
    if (!num) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let idx = 0;
    let value = num;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024;
      idx += 1;
    }
    return `${value.toFixed(value >= 100 || idx === 0 ? 0 : 1)} ${units[idx]}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    getConfig,
    isConfigured,
    createClient,
    requireConfigured,
    pageUrl,
    exchangeCodeIfPresent,
    getCurrentUser,
    signIn,
    signUp,
    sendPasswordReset,
    updatePassword,
    signOut,
    ensureProfile,
    fetchDashboardData,
    fallbackDisplayName,
    friendlyError,
    showToast,
    setBusy,
    formatDate,
    formatDateTime,
    formatBytes,
    escapeHtml
  };
})();
