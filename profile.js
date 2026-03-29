(() => {
  "use strict";

  const SUPABASE_URL = String(
    window.DIGIY_SUPABASE_URL || "https://wesqmwjjtsefyjnluosj.supabase.co"
  ).trim();

  const SUPABASE_ANON_KEY = String(
    window.DIGIY_SUPABASE_ANON ||
    window.DIGIY_SUPABASE_ANON_KEY ||
    "sb_publishable_tGHItRgeWDmGjnd0CK1DVQ_BIep4Ug3"
  ).trim();

  const MODULE_CODE = "BUILD";
  const PUBLIC_LISTING_URL = "https://beauville.github.io/digiy-build/listing.html";
  const PROFILE_SLUG_KEY = "digiy_build_profile_slug";

  const DEFAULT_HUB_BADGE = "";
  const DEFAULT_PRICE_LABEL = "";

  const gs = document.getElementById("guard_status");
  const msg = document.getElementById("msg");
  const $ = (id) => document.getElementById(id);

  let sb = null;
  let ACCESS = {
    slug: "",
    phone: ""
  };
  let EXISTING_ROW = null;

  function setGuard(text) {
    if (!gs) return;
    gs.textContent = text;
  }

  function setMsg(text, ok = true) {
    if (!msg) return;
    msg.innerHTML = `Statut : <span class="${ok ? "ok" : "bad"}">${escapeHtml(text)}</span>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normSlug(str) {
    return String(str || "")
      .toLowerCase()
      .trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "";
  }

  function slugify(str) {
    return normSlug(str) || ("pro-" + Math.random().toString(16).slice(2, 8));
  }

  function digits(v) {
    return String(v || "").replace(/[^\d]/g, "");
  }

  function parseTags(raw) {
    const s = String(raw || "").trim();
    if (!s) return null;

    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        return Array.isArray(arr) ? arr.map(x => String(x).trim()).filter(Boolean) : null;
      } catch (_) {}
    }

    return s.split(",").map(x => x.trim()).filter(Boolean);
  }

  function rememberProfileSlug(slug) {
    const s = normSlug(slug);
    if (!s) return;
    try {
      sessionStorage.setItem(PROFILE_SLUG_KEY, s);
      localStorage.setItem(PROFILE_SLUG_KEY, s);
    } catch (_) {}
  }

  function getRememberedProfileSlug() {
    try {
      return normSlug(
        sessionStorage.getItem(PROFILE_SLUG_KEY) ||
        localStorage.getItem(PROFILE_SLUG_KEY) ||
        ""
      );
    } catch (_) {
      return "";
    }
  }

  function buildSafeUrl(path, params = {}) {
    try {
      const url = new URL(path, window.location.href);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          url.searchParams.set(key, String(value));
        }
      });
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return path || "#";
    }
  }

  function computePublicLink(row) {
    const profileUrl = String(row?.profile_url || "").trim();
    if (profileUrl) return profileUrl;

    const q = row?.slug || row?.display_name || row?.trade || "";
    if (!q) return PUBLIC_LISTING_URL;

    return PUBLIC_LISTING_URL + "?q=" + encodeURIComponent(q);
  }

  function hydrateForm(row) {
    $("display_name").value = row.display_name || "";
    $("city").value = row.city || "";
    $("trade").value = row.trade || "";
    $("region").value = row.region || "petite-cote";
    $("sector").value = row.sector || "multi";
    $("whatsapp").value = row.whatsapp || "";
    $("phone").value = row.phone || "";
    $("bio").value = row.bio || "";
    $("photo_url").value = row.photo_url || "";
    $("profile_url").value = row.profile_url || "";
    $("badge").value = row.badge || "";
    $("hub_badge").value = row.hub_badge || "";
    $("price_label").value = row.price_label || "";
    $("priority").value = Number(row.priority ?? 1);
    $("is_published").value = String(!!row.is_published);
    $("slug").value = row.slug || "";

    try {
      $("tags").value = Array.isArray(row.tags) ? JSON.stringify(row.tags) : "";
    } catch (_) {
      $("tags").value = "";
    }
  }

  async function fetchByProfileSlug(profileSlug) {
    if (!profileSlug) return null;

    const { data, error } = await sb
      .from("digiy_build_public_profiles")
      .select("*")
      .eq("slug", profileSlug)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function fetchByContactPhone(phone) {
    const p = digits(phone);
    if (!p) return null;

    const { data, error } = await sb
      .from("digiy_build_public_profiles")
      .select("*")
      .or(`whatsapp.eq.${p},phone.eq.${p}`)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  function fillDefaultsIfUseful() {
    if (!$("whatsapp").value && ACCESS.phone) {
      $("whatsapp").value = ACCESS.phone;
    }
    if (!$("phone").value && ACCESS.phone) {
      $("phone").value = ACCESS.phone;
    }
  }

  async function loadExisting() {
    if (!sb) return;

    try {
      let row = null;

      const remembered = getRememberedProfileSlug();
      if (remembered) {
        row = await fetchByProfileSlug(remembered);
      }

      if (!row && ACCESS.phone) {
        row = await fetchByContactPhone(ACCESS.phone);
      }

      if (!row && $("slug").value.trim()) {
        row = await fetchByProfileSlug(normSlug($("slug").value));
      }

      EXISTING_ROW = row || null;

      if (!row) {
        $("slug").value = slugify($("display_name").value || "");
        fillDefaultsIfUseful();
        setMsg("Aucune fiche existante. Création possible.", true);
        return;
      }

      hydrateForm(row);
      fillDefaultsIfUseful();
      rememberProfileSlug(row.slug || "");
      setMsg("Fiche existante chargée.", true);
    } catch (e) {
      console.warn("loadExisting err:", e);
      setMsg("Impossible de charger la fiche.", false);
    }
  }

  function buildPayload() {
    const display_name = $("display_name").value.trim();
    const city = $("city").value.trim();
    const trade = $("trade").value.trim();
    const region = $("region").value.trim();
    const sector = $("sector").value.trim();
    const whatsapp = digits($("whatsapp").value);
    const phone = digits($("phone").value);
    const bio = $("bio").value.trim();
    const photo_url = $("photo_url").value.trim();
    const profile_url = $("profile_url").value.trim();
    const badge = $("badge").value.trim();
    const hub_badge = $("hub_badge").value.trim();
    const price_label = $("price_label").value.trim();
    const priority = Math.max(0, Math.min(100, parseInt($("priority").value, 10) || 1));
    const is_published = $("is_published").value === "true";
    const tags = parseTags($("tags").value);

    if (!display_name) throw new Error("Nom visible requis");
    if (!whatsapp) throw new Error("WhatsApp requis");

    let slug = normSlug($("slug").value);
    if (!slug) {
      slug = slugify(display_name);
      $("slug").value = slug;
    }

    return {
      slug,
      display_name,
      trade: trade || null,
      sector: sector || null,
      region: region || null,
      city: city || null,
      address: null,
      whatsapp,
      phone: phone || ACCESS.phone || null,
      photo_url: photo_url || null,
      bio: bio || null,
      tags: tags || null,
      profile_url: profile_url || null,
      is_published,
      is_active: true,
      is_verified: true,
      priority,
      badge: badge || null,
      hub_badge: hub_badge || DEFAULT_HUB_BADGE || null,
      price_label: price_label || DEFAULT_PRICE_LABEL || null
    };
  }

  async function saveProfile() {
    if (!sb) {
      setMsg("Supabase non disponible.", false);
      return;
    }

    try {
      const payload = buildPayload();
      setMsg("Enregistrement en cours…", true);

      let res;

      if (EXISTING_ROW?.id) {
        res = await sb
          .from("digiy_build_public_profiles")
          .update(payload)
          .eq("id", EXISTING_ROW.id)
          .select("*")
          .maybeSingle();
      } else {
        res = await sb
          .from("digiy_build_public_profiles")
          .insert(payload)
          .select("*")
          .maybeSingle();

        if (res?.error) {
          res = await sb
            .from("digiy_build_public_profiles")
            .upsert(payload, { onConflict: "slug" })
            .select("*")
            .maybeSingle();
        }
      }

      if (res?.error) {
        console.error(res.error);
        setMsg("Erreur : " + (res.error.message || res.error), false);
        return;
      }

      EXISTING_ROW = res.data || payload;
      rememberProfileSlug(EXISTING_ROW.slug || payload.slug);

      setMsg(`OK ✅ fiche enregistrée • visible=${payload.is_published ? "oui" : "non"}`, true);
    } catch (e) {
      console.error(e);
      setMsg(e?.message || "Erreur", false);
    }
  }

  function reSlug() {
    const dn = $("display_name").value.trim();
    const newSlug = slugify(dn || "");
    $("slug").value = newSlug;
    setMsg("Identifiant régénéré ✅", true);
  }

  async function copyLink() {
    let link = "";
    try {
      link = computePublicLink(EXISTING_ROW || buildPayload());
    } catch (_) {
      link = computePublicLink(EXISTING_ROW);
    }

    if (!link) {
      setMsg("Pas de lien pour le moment.", false);
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setMsg("Lien copié ✅", true);
    } catch (_) {
      setMsg("Copie impossible. Lien : " + link, true);
    }
  }

  function openLink() {
    let link = "";
    try {
      link = computePublicLink(EXISTING_ROW || buildPayload());
    } catch (_) {
      link = computePublicLink(EXISTING_ROW);
    }

    if (!link) {
      setMsg("Pas de lien pour le moment. Enregistre d’abord.", false);
      return;
    }

    window.open(link, "_blank", "noopener");
  }

  function openListing() {
    window.open(PUBLIC_LISTING_URL, "_blank", "noopener");
  }

  function goBack() {
    const url = buildSafeUrl("./cockpit.html", {
      slug: ACCESS.slug,
      phone: ACCESS.phone
    });
    window.location.href = url;
  }

  async function init() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      setGuard("Supabase non chargé");
      return;
    }

    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    if (!window.DIGIY_GUARD || !window.DIGIY_GUARD.ready) {
      setGuard("Protection non chargée");
      return;
    }

    await window.DIGIY_GUARD.ready;
    const st = window.DIGIY_GUARD.state || {};

    if (st.preview || !st.access_ok || !st.slug) {
      setGuard("Accès refusé");
      const hinted = st.slug || new URLSearchParams(location.search).get("slug") || "";
      setTimeout(() => {
        location.replace("./pin.html" + (hinted ? ("?slug=" + encodeURIComponent(hinted)) : ""));
      }, 500);
      return;
    }

    ACCESS.slug = String(st.slug || "").toLowerCase();
    ACCESS.phone = String(st.phone || "");

    document.documentElement.classList.add("access-ok");

    if (gs) {
      gs.textContent = "Accès OK";
      setTimeout(() => {
        gs.style.display = "none";
      }, 700);
    }

    fillDefaultsIfUseful();

    setMsg("Prêt ✅ Chargement de la fiche…", true);
    await loadExisting();

    $("btnSave").addEventListener("click", saveProfile);
    $("btnReSlug").addEventListener("click", reSlug);
    $("btnCopyLink").addEventListener("click", copyLink);
    $("btnOpenLink").addEventListener("click", openLink);
    $("btnOpenListing").addEventListener("click", openListing);
    $("btnBack").addEventListener("click", goBack);
  }

  init().catch((e) => {
    console.error(e);
    setGuard("Erreur de chargement");
    setMsg("Erreur chargement fiche.", false);
  });
})();
