/* guard.js — ENTREPRENEUR MULTI SERVICES / BUILD GUARD
   Rail attendu :
   - slug-only : ?slug=build-221...
   - window.DIGIY_GUARD.ready()
   - window.DIGIY_GUARD.state
   - window.DIGIY_GUARD.loginWithPin(slug, pin)
*/
(() => {
  "use strict";

  const SUPABASE_URL = "https://wesqmwjjtsefyjnluosj.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_tGHItRgeWDmGjnd0CK1DVQ_BIep4Ug3";

  const MODULE_CODE = "BUILD";
  const MODULE_CODE_LOWER = "build";
  const LOGIN_URL = window.DIGIY_LOGIN_URL || "./pin.html";
  const PAY_URL = "https://commencer-a-payer.digiylyfe.com/";

  // Doctrine BUILD : pas de preview libre sur les pages protégées
  const ALLOW_PREVIEW_WITHOUT_IDENTITY = false;

  // Clés module-first
  const MODULE_PREFIX = "digiy_build";
  const MODULE_SESSION_KEY = "DIGIY_BUILD_SESSION";
  const MODULE_ACCESS_KEY = "DIGIY_BUILD_ACCESS";

  // Compatibilité ancienne génération
  const LEGACY_SESSION_KEY = "DIGIY_SESSION";
  const LEGACY_ACCESS_KEY = "DIGIY_ACCESS";

  const state = {
    preview: false,
    access_ok: false,
    reason: "booting",
    slug: "",
    phone: "",
    module: MODULE_CODE
  };

  let bootPromise = null;

  const api = {
    state,
    ready,
    getSession,
    loginWithPin,
    logout,
    getSlug: () => state.slug || "",
    getPhone: () => state.phone || "",
    getModule: () => MODULE_CODE
  };

  window.DIGIY_GUARD = api;

  function showPage() {
    try {
      document.documentElement.style.visibility = "";
    } catch (_) {}
  }

  function hidePage() {
    try {
      document.documentElement.style.visibility = "hidden";
    } catch (_) {}
  }

  function normPhone(v) {
    return String(v || "").replace(/[^\d]/g, "");
  }

  function normPin(v) {
    return String(v || "").trim().replace(/\s+/g, "");
  }

  function normSlug(v) {
    return String(v || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getQs() {
    return new URLSearchParams(window.location.search);
  }

  function jsonHeaders() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    };
  }

  function getHeaders() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json"
    };
  }

  async function rpc(name, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(body || {})
    });

    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  }

  async function tableGet(table, paramsObj) {
    const params = new URLSearchParams(paramsObj || {});
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
      method: "GET",
      headers: getHeaders()
    });

    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  }

  function setState(patch) {
    Object.assign(state, patch || {});
    api.state = state;
    window.DIGIY_GUARD.state = state;
  }

  function writeJsonStorage(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (_) {}
  }

  function readJsonStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function rememberIdentity({ slug, phone }) {
    const s = normSlug(slug);
    const p = normPhone(phone);

    const sessionObj = {
      module: MODULE_CODE,
      slug: s || "",
      phone: p || "",
      at: nowIso()
    };

    try {
      if (s) {
        sessionStorage.setItem(`${MODULE_PREFIX}_slug`, s);
        sessionStorage.setItem(`${MODULE_PREFIX}_last_slug`, s);
        localStorage.setItem(`${MODULE_PREFIX}_last_slug`, s);
      }

      if (p) {
        sessionStorage.setItem(`${MODULE_PREFIX}_phone`, p);
        localStorage.setItem(`${MODULE_PREFIX}_phone`, p);
      }

      // module-first
      writeJsonStorage(MODULE_SESSION_KEY, sessionObj);
      writeJsonStorage(MODULE_ACCESS_KEY, sessionObj);

      // compat douce avec anciens fronts DIGIY
      writeJsonStorage(LEGACY_SESSION_KEY, sessionObj);
      writeJsonStorage(LEGACY_ACCESS_KEY, sessionObj);

      window.DIGIY_ACCESS = Object.assign({}, window.DIGIY_ACCESS || {}, sessionObj);
    } catch (_) {}
  }

  function clearIdentity() {
    try {
      sessionStorage.removeItem(`${MODULE_PREFIX}_slug`);
      sessionStorage.removeItem(`${MODULE_PREFIX}_last_slug`);
      sessionStorage.removeItem(`${MODULE_PREFIX}_phone`);

      localStorage.removeItem(`${MODULE_PREFIX}_last_slug`);
      localStorage.removeItem(`${MODULE_PREFIX}_phone`);

      localStorage.removeItem(MODULE_SESSION_KEY);
      localStorage.removeItem(MODULE_ACCESS_KEY);

      // on nettoie aussi les anciennes clés pour éviter les collisions
      localStorage.removeItem(LEGACY_SESSION_KEY);
      localStorage.removeItem(LEGACY_ACCESS_KEY);

      delete window.DIGIY_ACCESS;
    } catch (_) {}
  }

  function readStoredSession() {
    const candidates = [
      readJsonStorage(MODULE_SESSION_KEY),
      readJsonStorage(MODULE_ACCESS_KEY),
      readJsonStorage(LEGACY_SESSION_KEY),
      readJsonStorage(LEGACY_ACCESS_KEY),
      window.DIGIY_ACCESS || null
    ].filter(Boolean);

    for (const item of candidates) {
      const module = String(item.module || "").toUpperCase();
      const slug = normSlug(item.slug);
      const phone = normPhone(item.phone);

      if (!slug && !phone) continue;

      if (!module || module === MODULE_CODE) {
        return { slug, phone, module: MODULE_CODE };
      }
    }

    return null;
  }

  function getSession() {
    const qs = getQs();

    const fromUrlSlug = normSlug(qs.get("slug") || "");
    const fromUrlPhone = normPhone(qs.get("phone") || "");
    const stored = readStoredSession();

    const sessionSlug = normSlug(
      fromUrlSlug ||
      sessionStorage.getItem(`${MODULE_PREFIX}_slug`) ||
      sessionStorage.getItem(`${MODULE_PREFIX}_last_slug`) ||
      localStorage.getItem(`${MODULE_PREFIX}_last_slug`) ||
      stored?.slug ||
      ""
    );

    const sessionPhone = normPhone(
      fromUrlPhone ||
      sessionStorage.getItem(`${MODULE_PREFIX}_phone`) ||
      localStorage.getItem(`${MODULE_PREFIX}_phone`) ||
      stored?.phone ||
      ""
    );

    return {
      module: MODULE_CODE,
      slug: sessionSlug,
      phone: sessionPhone
    };
  }

  function enrichUrlIfMissingSlug(slug) {
    const s = normSlug(slug);
    if (!s) return;

    const qs = getQs();
    const current = normSlug(qs.get("slug") || "");
    if (current === s) return;

    const u = new URL(window.location.href);
    u.searchParams.set("slug", s);
    history.replaceState(null, "", u.toString());
  }

  function buildLoginUrl(slug) {
    const u = new URL(LOGIN_URL, window.location.href);
    const s = normSlug(slug);

    if (s) u.searchParams.set("slug", s);
    u.searchParams.set("next", window.location.pathname + window.location.search);

    return u.toString();
  }

  function goLogin(slug) {
    window.location.replace(buildLoginUrl(slug));
  }

  function buildPayUrl({ slug, phone }) {
    const u = new URL(PAY_URL);
    const s = normSlug(slug);
    const p = normPhone(phone);

    u.searchParams.set("module", MODULE_CODE);
    if (s) u.searchParams.set("slug", s);
    if (p) u.searchParams.set("phone", p);
    u.searchParams.set("return", window.location.href);

    return u.toString();
  }

  function goPay({ slug, phone }) {
    window.location.replace(buildPayUrl({ slug, phone }));
  }

  async function resolveSubBySlug(slug) {
    const s = normSlug(slug);
    if (!s) return null;

    const tries = [
      {
        select: "phone,slug,module",
        slug: `eq.${s}`,
        module: `eq.${MODULE_CODE}`,
        limit: "1"
      },
      {
        select: "phone,slug,module",
        slug: `eq.${s}`,
        module: `eq.${MODULE_CODE_LOWER}`,
        limit: "1"
      }
    ];

    for (const params of tries) {
      const res = await tableGet("digiy_subscriptions_public", params);
      if (!res.ok || !Array.isArray(res.data) || !res.data[0]) continue;

      return {
        slug: normSlug(res.data[0].slug),
        phone: normPhone(res.data[0].phone),
        module: String(res.data[0].module || "")
      };
    }

    return null;
  }

  async function resolveSubByPhone(phone) {
    const p = normPhone(phone);
    if (!p) return null;

    const tries = [
      {
        select: "phone,slug,module",
        phone: `eq.${p}`,
        module: `eq.${MODULE_CODE}`,
        limit: "1"
      },
      {
        select: "phone,slug,module",
        phone: `eq.${p}`,
        module: `eq.${MODULE_CODE_LOWER}`,
        limit: "1"
      }
    ];

    for (const params of tries) {
      const res = await tableGet("digiy_subscriptions_public", params);
      if (!res.ok || !Array.isArray(res.data) || !res.data[0]) continue;

      return {
        slug: normSlug(res.data[0].slug),
        phone: normPhone(res.data[0].phone),
        module: String(res.data[0].module || "")
      };
    }

    return null;
  }

  async function checkAccess(phone) {
    const p = normPhone(phone);
    if (!p) return false;

    const tries = [
      { name: "digiy_has_access", body: { p_phone: p, p_module: MODULE_CODE } },
      { name: "digiy_has_access", body: { p_phone: p, p_module: MODULE_CODE_LOWER } },
      { name: "digiy_has_access", body: { phone: p, module: MODULE_CODE } },
      { name: "digiy_has_access", body: { phone: p, module: MODULE_CODE_LOWER } }
    ];

    for (const t of tries) {
      const res = await rpc(t.name, t.body);
      if (!res.ok) continue;

      if (res.data === true) return true;
      if (res.data?.ok === true) return true;
      if (res.data?.access === true) return true;
      if (res.data?.has_access === true) return true;
    }

    return false;
  }

  function parseVerifyPinPayload(data, fallbackPhone = "") {
    const raw = Array.isArray(data) ? data[0] : data;
    if (!raw) return null;

    // Cas 1 : objet JSON explicite
    if (typeof raw === "object" && !Array.isArray(raw)) {
      if (raw.ok === true) {
        return {
          ok: true,
          phone: normPhone(raw.phone || raw.p_phone || fallbackPhone || ""),
          module: String(raw.module || raw.p_module || MODULE_CODE).toUpperCase(),
          owner_id: raw.owner_id || null
        };
      }

      // Cas 2 : composite PostgREST sérialisé en objet {f1:true,f2:"BUILD",f3:"221..."}
      const vals = Object.values(raw);
      if (vals.length >= 3) {
        const okLike =
          vals[0] === true ||
          vals[0] === "t" ||
          vals[0] === "true" ||
          vals[0] === 1;

        if (okLike) {
          return {
            ok: true,
            module: String(vals[1] || MODULE_CODE).toUpperCase(),
            phone: normPhone(vals[2] || fallbackPhone || ""),
            owner_id: vals[4] || null
          };
        }
      }
    }

    // Cas 3 : string tuple PostgreSQL "(t,BUILD,221771342889,...)"
    if (typeof raw === "string") {
      const txt = raw.trim();

      if (txt.startsWith("(") && txt.endsWith(")")) {
        const tupleHead = txt.match(/^\(([^,]+),([^,]+),([^,]+),?(.*)\)$/);
        if (tupleHead) {
          const okToken = String(tupleHead[1] || "").trim().replace(/^"|"$/g, "");
          const modToken = String(tupleHead[2] || "").trim().replace(/^"|"$/g, "");
          const phoneToken = String(tupleHead[3] || "").trim().replace(/^"|"$/g, "");

          const okLike =
            okToken === "t" ||
            okToken === "true" ||
            okToken === "1";

          if (okLike) {
            return {
              ok: true,
              module: modToken ? modToken.toUpperCase() : MODULE_CODE,
              phone: normPhone(phoneToken || fallbackPhone || ""),
              owner_id: null
            };
          }
        }
      }
    }

    return null;
  }

  async function attemptPinLoginRPCs(slug, pin, phone) {
    const s = normSlug(slug);
    const p = normPin(pin);
    const ph = normPhone(phone);

    if (!ph || !p) return null;

    const tries = [
      {
        name: "digiy_verify_pin",
        body: { p_phone: ph, p_module: MODULE_CODE, p_pin: p }
      },
      {
        name: "digiy_verify_pin",
        body: { p_phone: ph, p_module: MODULE_CODE_LOWER, p_pin: p }
      }
    ];

    for (const t of tries) {
      const res = await rpc(t.name, t.body);
      if (!res.ok) continue;

      const parsed = parseVerifyPinPayload(res.data, ph);
      if (parsed?.ok) {
        return {
          ok: true,
          slug: s,
          phone: normPhone(parsed.phone || ph),
          owner_id: parsed.owner_id || null
        };
      }
    }

    return null;
  }

  async function attemptPinLoginTable() {
    return null;
  }

  async function loginWithPin(slug, pin) {
    const s = normSlug(slug);
    const p = normPin(pin);

    if (!s) return { ok: false, error: "Slug manquant." };
    if (!p) return { ok: false, error: "PIN manquant." };

    const sub = await resolveSubBySlug(s);
    const phone = normPhone(sub?.phone);

    if (!phone) {
      return { ok: false, error: "Slug inconnu." };
    }

    let auth = await attemptPinLoginRPCs(s, p, phone);
    if (!auth) {
      auth = await attemptPinLoginTable(s, p, phone);
    }

    if (!auth?.ok) {
      return { ok: false, error: "PIN invalide." };
    }

    const finalPhone = normPhone(auth.phone || phone);
    const hasAccess = await checkAccess(finalPhone);

    if (!hasAccess) {
      return { ok: false, error: "Abonnement inactif." };
    }

    rememberIdentity({ slug: s, phone: finalPhone });
    enrichUrlIfMissingSlug(s);

    setState({
      preview: false,
      access_ok: true,
      reason: "pin_ok",
      slug: s,
      phone: finalPhone
    });

    showPage();

    return {
      ok: true,
      slug: s,
      phone: finalPhone,
      owner_id: auth.owner_id || null
    };
  }

  function logout() {
    clearIdentity();

    setState({
      preview: false,
      access_ok: false,
      reason: "logged_out",
      slug: "",
      phone: ""
    });

    showPage();
    goLogin("");
  }

  async function boot() {
    hidePage();

    try {
      let { slug, phone } = getSession();

      if (slug && !phone) {
        const sub = await resolveSubBySlug(slug);
        if (sub?.phone) phone = normPhone(sub.phone);
        if (sub?.slug) slug = normSlug(sub.slug);
      }

      if (phone && !slug) {
        const sub = await resolveSubByPhone(phone);
        if (sub?.slug) slug = normSlug(sub.slug);
      }

      if (slug || phone) {
        rememberIdentity({ slug, phone });
      }

      if (!slug && !phone) {
        if (ALLOW_PREVIEW_WITHOUT_IDENTITY) {
          setState({
            preview: true,
            access_ok: false,
            reason: "preview_no_identity",
            slug: "",
            phone: ""
          });
          showPage();
          return state;
        }

        setState({
          preview: false,
          access_ok: false,
          reason: "missing_identity",
          slug: "",
          phone: ""
        });

        showPage();
        goLogin("");
        return null;
      }

      if (!phone && slug) {
        setState({
          preview: false,
          access_ok: false,
          reason: "phone_unresolved",
          slug: normSlug(slug),
          phone: ""
        });

        showPage();
        goLogin(slug);
        return null;
      }

      if (phone) {
        const ok = await checkAccess(phone);

        if (ok) {
          if (slug) enrichUrlIfMissingSlug(slug);

          rememberIdentity({ slug, phone });

          setState({
            preview: false,
            access_ok: true,
            reason: "access_ok",
            slug: normSlug(slug),
            phone: normPhone(phone)
          });

          showPage();
          return state;
        }

        if (ALLOW_PREVIEW_WITHOUT_IDENTITY) {
          setState({
            preview: true,
            access_ok: false,
            reason: "no_subscription",
            slug: normSlug(slug),
            phone: normPhone(phone)
          });
          showPage();
          return state;
        }

        setState({
          preview: false,
          access_ok: false,
          reason: "subscription_inactive",
          slug: normSlug(slug),
          phone: normPhone(phone)
        });

        showPage();
        goLogin(slug || "");
        return null;
      }

      setState({
        preview: false,
        access_ok: false,
        reason: "unknown_identity",
        slug: normSlug(slug),
        phone: ""
      });

      showPage();
      goLogin(slug || "");
      return null;
    } catch (e) {
      console.error("DIGIY_GUARD boot error:", e);

      setState({
        preview: false,
        access_ok: false,
        reason: "guard_error",
        slug: "",
        phone: ""
      });

      showPage();
      goLogin("");
      return null;
    }
  }

  function ready() {
    if (!bootPromise) {
      bootPromise = boot();
    }
    return bootPromise;
  }

  ready();
})();
