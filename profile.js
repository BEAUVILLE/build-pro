(() => {
  "use strict";

  const MODULE = "BUILD";
  const TABLE = "digiy_build_public_profiles";
  const SUPPORT_PHONE = "221771342889";
  const DRAFT_PREFIX = "DIGIY_BUILD_PROFILE_DRAFT::";
  const CACHE_PREFIX = "DIGIY_BUILD_PROFILE_CACHE::";

  const state = {
    slug: "",
    phone: "",
    owner_id: null,
    access_ok: false,
    loading: false,
    saving: false,
    remote_loaded: false,
    remote_available: false,
    row: null,
    client: null
  };

  const IDS = [
    "display_name",
    "city",
    "trade",
    "region",
    "sector",
    "priority",
    "whatsapp",
    "phone",
    "bio",
    "photo_url",
    "profile_url",
    "badge",
    "hub_badge",
    "price_label",
    "tags",
    "slug",
    "is_published"
  ];

  const $ = (id) => document.getElementById(id);
  const els = {};

  function bindElements() {
    IDS.forEach((id) => {
      els[id] = $(id);
    });
    els.guard = $("guard_status");
    els.msg = $("msg");
    els.btnSave = $("btnSave");
    els.btnReSlug = $("btnReSlug");
    els.btnOpenListing = $("btnOpenListing");
    els.btnBack = $("btnBack");
    els.btnCopyLink = $("btnCopyLink");
    els.btnOpenLink = $("btnOpenLink");
  }

  function text(v) {
    return String(v ?? "").trim();
  }

  function normSlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function normPhone(value) {
    const raw = String(value || "").trim();
    const cleaned = raw.replace(/[^\d+]/g, "");
    const digits = cleaned.replace(/[^\d]/g, "");
    if (!digits) return "";
    return cleaned.startsWith("+") ? `+${digits}` : digits;
  }

  function clampNumber(value, fallback = 1, min = 0, max = 100) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function toBool(value) {
    if (typeof value === "boolean") return value;
    const v = String(value ?? "").trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes" || v === "on";
  }

  function maybeUrl(value) {
    const raw = text(value);
    if (!raw) return "";
    try {
      return new URL(raw).toString();
    } catch (_) {
      return "";
    }
  }

  function slugifyHuman(value) {
    const slug = normSlug(value);
    if (slug) return slug;
    return state.slug || `build-${Date.now()}`;
  }

  function parseTags(raw) {
    const source = text(raw);
    if (!source) return [];

    if (source.startsWith("[") && source.endsWith("]")) {
      try {
        const arr = JSON.parse(source);
        if (Array.isArray(arr)) {
          return arr
            .map((v) => text(v))
            .filter(Boolean);
        }
      } catch (_) {}
    }

    return source
      .split(",")
      .map((v) => text(v))
      .filter(Boolean);
  }

  function formatTags(value) {
    if (Array.isArray(value)) {
      return value.map((v) => text(v)).filter(Boolean).join(",");
    }
    if (typeof value === "string") {
      const raw = value.trim();
      if (!raw) return "";
      if (raw.startsWith("[") && raw.endsWith("]")) {
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            return arr.map((v) => text(v)).filter(Boolean).join(",");
          }
        } catch (_) {}
      }
      return raw;
    }
    return "";
  }

  function firstOf(obj, keys, fallback = "") {
    for (const key of keys) {
      if (!obj || !(key in obj)) continue;
      const value = obj[key];
      if (value === null || value === undefined) continue;
      if (typeof value === "string") {
        if (value.trim() === "") continue;
        return value;
      }
      return value;
    }
    return fallback;
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

  function dashboardUrl() {
    return buildSafeUrl("./dashboard-pro.html", {
      slug: state.slug,
      phone: state.phone
    });
  }

  function publicOrigin() {
    try {
      const url = new URL(window.location.href);
      if (url.hostname.startsWith("pro-")) {
        url.hostname = url.hostname.replace(/^pro-/, "");
      }
      return url.origin;
    } catch (_) {
      return window.location.origin;
    }
  }

  function inferredProfileUrl() {
    const explicit = maybeUrl(els.profile_url?.value);
    if (explicit) return explicit;

    try {
      const url = new URL("/", publicOrigin());
      if (state.slug) url.searchParams.set("slug", state.slug);
      return url.toString();
    } catch (_) {
      return "";
    }
  }

  function listingUrl() {
    try {
      return new URL("/", publicOrigin()).toString();
    } catch (_) {
      return publicOrigin();
    }
  }

  function draftKey(slug = state.slug) {
    return `${DRAFT_PREFIX}${normSlug(slug || "noslug")}`;
  }

  function cacheKey(slug = state.slug) {
    return `${CACHE_PREFIX}${normSlug(slug || "noslug")}`;
  }

  function saveLocalObject(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function readLocalObject(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (_) {
      return null;
    }
  }

  function removeLocalObject(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  function setGuardStatus(message) {
    if (els.guard) els.guard.textContent = message;
  }

  function setMsg(message, kind = "neutral") {
    if (!els.msg) return;
    els.msg.classList.remove("ok", "bad");
    if (kind === "ok") els.msg.classList.add("ok");
    if (kind === "bad") els.msg.classList.add("bad");
    els.msg.innerHTML = message;
  }

  function setButtonsDisabled(disabled) {
    [
      els.btnSave,
      els.btnReSlug,
      els.btnOpenListing,
      els.btnBack,
      els.btnCopyLink,
      els.btnOpenLink
    ].forEach((button) => {
      if (button) button.disabled = !!disabled;
    });
  }

  function openAccess() {
    document.documentElement.classList.add("access-ok");
    setGuardStatus("Accès ouvert");
  }

  function closeAccess(message = "Accès fermé") {
    document.documentElement.classList.remove("access-ok");
    setGuardStatus(message);
  }

  function supportUrl() {
    const txt = encodeURIComponent(
      "Support ENTREPRENEUR MULTI SERVICES.\n" +
      "Identifiant : " + (state.slug || "") + "\n" +
      "Téléphone : " + (state.phone || "") + "\n" +
      "Besoin d’aide sur la fiche."
    );
    return "https://wa.me/" + SUPPORT_PHONE + "?text=" + txt;
  }

  function getSupabaseClient() {
    if (state.client) return state.client;

    const url = window.DIGIY_SUPABASE_URL || "";
    const key = window.DIGIY_SUPABASE_ANON || window.DIGIY_SUPABASE_ANON_KEY || "";

    if (!url || !key || !window.supabase || typeof window.supabase.createClient !== "function") {
      return null;
    }

    state.client = window.supabase.createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    return state.client;
  }

  function buildFormState() {
    const displayName = text(els.display_name?.value);
    const slug = normSlug(els.slug?.value || state.slug || slugifyHuman(displayName || els.trade?.value));
    const phone = normPhone(els.phone?.value || state.phone);
    const whatsapp = normPhone(els.whatsapp?.value || phone);
    const tagsArr = parseTags(els.tags?.value);
    const profileUrl = maybeUrl(els.profile_url?.value) || inferredProfileUrl();

    return {
      slug,
      phone,
      display_name: displayName,
      city: text(els.city?.value),
      trade: text(els.trade?.value),
      region: text(els.region?.value) || "petite-cote",
      sector: text(els.sector?.value) || "multi",
      priority: clampNumber(els.priority?.value, 1, 0, 100),
      whatsapp,
      bio: text(els.bio?.value),
      photo_url: maybeUrl(els.photo_url?.value),
      profile_url: profileUrl,
      badge: text(els.badge?.value),
      hub_badge: text(els.hub_badge?.value),
      price_label: text(els.price_label?.value),
      tags: tagsArr,
      tags_text: tagsArr.join(","),
      is_published: toBool(els.is_published?.value),
      module: MODULE,
      owner_id: state.owner_id || null,
      updated_at: new Date().toISOString()
    };
  }

  function fillDefaults() {
    if (!els.slug.value) els.slug.value = state.slug || "";
    if (!els.phone.value) els.phone.value = state.phone || "";
    if (!els.whatsapp.value) els.whatsapp.value = state.phone || "";
    if (!els.region.value) els.region.value = "petite-cote";
    if (!els.sector.value) els.sector.value = "multi";
    if (!els.priority.value) els.priority.value = "1";
    if (!els.profile_url.value) els.profile_url.value = inferredProfileUrl();
  }

  function applyRow(row) {
    const safe = row || {};

    els.display_name.value = text(firstOf(safe, ["display_name", "public_label", "name", "title"]));
    els.city.value = text(firstOf(safe, ["city", "zone", "quartier", "location"]));
    els.trade.value = text(firstOf(safe, ["trade", "activity", "job_title", "profession"]));
    els.region.value = text(firstOf(safe, ["region", "city_zone"], "petite-cote")) || "petite-cote";
    els.sector.value = text(firstOf(safe, ["sector", "category"], "multi")) || "multi";
    els.priority.value = String(clampNumber(firstOf(safe, ["priority", "priority_rank"], 1), 1, 0, 100));
    els.whatsapp.value = normPhone(firstOf(safe, ["whatsapp", "whatsapp_phone", "phone"], state.phone));
    els.phone.value = normPhone(firstOf(safe, ["phone", "owner_phone", "contact_phone"], state.phone));
    els.bio.value = text(firstOf(safe, ["bio", "description", "short_description", "about"]));
    els.photo_url.value = text(firstOf(safe, ["photo_url", "photo", "image_url", "cover_url"]));
    els.profile_url.value = maybeUrl(firstOf(safe, ["profile_url", "public_url", "url"])) || inferredProfileUrl();
    els.badge.value = text(firstOf(safe, ["badge", "tagline", "headline_badge"]));
    els.hub_badge.value = text(firstOf(safe, ["hub_badge", "public_badge"]));
    els.price_label.value = text(firstOf(safe, ["price_label", "price_text", "offer_label"]));
    els.tags.value = formatTags(firstOf(safe, ["tags", "keywords", "tag_list"], []));
    els.slug.value = normSlug(firstOf(safe, ["slug"], state.slug));
    els.is_published.value = toBool(firstOf(safe, ["is_published", "published", "is_public"], false)) ? "true" : "false";

    fillDefaults();
  }

  function applyDraft(row) {
    if (!row || typeof row !== "object") {
      fillDefaults();
      return;
    }
    applyRow(row);
  }

  function saveDraft() {
    const payload = buildFormState();
    saveLocalObject(draftKey(payload.slug || state.slug), {
      ...payload,
      saved_locally_at: new Date().toISOString()
    });
  }

  let draftTimer = null;
  function scheduleDraftSave() {
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try {
        saveDraft();
      } catch (_) {}
    }, 250);
  }

  async function loadRemoteProfile() {
    const client = getSupabaseClient();
    if (!client || !state.slug) return { ok: false, data: null, error: null };

    try {
      let res = await client
        .from(TABLE)
        .select("*")
        .eq("slug", state.slug)
        .limit(1)
        .maybeSingle();

      if (!res.error && res.data) {
        return { ok: true, data: res.data, error: null };
      }

      if (state.phone) {
        res = await client
          .from(TABLE)
          .select("*")
          .eq("phone", state.phone)
          .limit(1)
          .maybeSingle();

        if (!res.error && res.data) {
          return { ok: true, data: res.data, error: null };
        }
      }

      return { ok: true, data: null, error: res.error || null };
    } catch (error) {
      return { ok: false, data: null, error };
    }
  }

  async function upsertPayload(payload) {
    const client = getSupabaseClient();
    if (!client) {
      return { ok: false, error: new Error("Supabase indisponible") };
    }

    try {
      const { data, error } = await client
        .from(TABLE)
        .upsert(payload, { onConflict: "slug" })
        .select("*")
        .maybeSingle();

      if (error) return { ok: false, error };
      return { ok: true, data: data || payload };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async function saveRemoteProfile(form) {
    const payloads = [
      {
        slug: form.slug,
        phone: form.phone,
        display_name: form.display_name,
        city: form.city,
        trade: form.trade,
        region: form.region,
        sector: form.sector,
        priority: form.priority,
        whatsapp: form.whatsapp,
        bio: form.bio,
        photo_url: form.photo_url,
        profile_url: form.profile_url,
        badge: form.badge,
        hub_badge: form.hub_badge,
        price_label: form.price_label,
        tags: form.tags,
        is_published: form.is_published,
        module: form.module,
        owner_id: form.owner_id,
        updated_at: form.updated_at
      },
      {
        slug: form.slug,
        phone: form.phone,
        display_name: form.display_name,
        city: form.city,
        trade: form.trade,
        region: form.region,
        sector: form.sector,
        priority: form.priority,
        whatsapp_phone: form.whatsapp,
        bio: form.bio,
        photo_url: form.photo_url,
        public_url: form.profile_url,
        badge: form.badge,
        public_badge: form.hub_badge,
        price_label: form.price_label,
        tags: form.tags_text,
        is_published: form.is_published,
        module: form.module,
        owner_id: form.owner_id,
        updated_at: form.updated_at
      },
      {
        slug: form.slug,
        phone: form.phone,
        display_name: form.display_name,
        city: form.city,
        trade: form.trade,
        sector: form.sector,
        bio: form.bio,
        is_published: form.is_published,
        updated_at: form.updated_at
      },
      {
        slug: form.slug,
        phone: form.phone,
        display_name: form.display_name,
        sector: form.sector,
        updated_at: form.updated_at
      }
    ];

    let lastError = null;

    for (const payload of payloads) {
      const res = await upsertPayload(payload);
      if (res.ok) return res;
      lastError = res.error || lastError;
    }

    return { ok: false, error: lastError || new Error("Échec de sauvegarde distante") };
  }

  async function loadProfile() {
    state.loading = true;
    setMsg("Chargement de ta fiche…");

    const localDraft = readLocalObject(draftKey());
    const localCache = readLocalObject(cacheKey());
    const remote = await loadRemoteProfile();

    if (remote.ok && remote.data) {
      state.row = remote.data;
      state.remote_loaded = true;
      state.remote_available = true;
      applyRow(remote.data);
      setMsg("Fiche chargée depuis le rail principal.", "ok");
      saveLocalObject(cacheKey(state.slug), remote.data);
      removeLocalObject(draftKey(state.slug));
      state.loading = false;
      return;
    }

    if (localDraft) {
      applyDraft(localDraft);
      setMsg("Aucun retour distant pour le moment. Brouillon local rechargé sur cet appareil.", "ok");
      state.loading = false;
      return;
    }

    if (localCache) {
      applyDraft(localCache);
      setMsg("Dernière fiche connue rechargée depuis cet appareil.", "ok");
      state.loading = false;
      return;
    }

    fillDefaults();
    setMsg("Nouvelle fiche prête. Tu peux remplir puis enregistrer.");
    state.loading = false;
  }

  async function saveProfile() {
    if (state.saving) return;

    const form = buildFormState();
    if (!form.slug) {
      setMsg("Ajoute un identifiant ou un nom visible pour générer ta fiche.", "bad");
      els.slug.focus();
      return;
    }

    if (!form.display_name) {
      setMsg("Ajoute au moins un nom visible.", "bad");
      els.display_name.focus();
      return;
    }

    state.slug = form.slug;
    state.phone = form.phone || state.phone;

    els.slug.value = form.slug;
    if (!els.phone.value && state.phone) els.phone.value = state.phone;
    if (!els.profile_url.value) els.profile_url.value = inferredProfileUrl();

    saveLocalObject(draftKey(form.slug), {
      ...form,
      saved_locally_at: new Date().toISOString()
    });

    state.saving = true;
    setButtonsDisabled(true);
    setMsg("Enregistrement en cours…");

    const remote = await saveRemoteProfile(form);

    state.saving = false;
    setButtonsDisabled(false);

    if (remote.ok) {
      state.row = remote.data || form;
      state.remote_available = true;
      state.remote_loaded = true;
      saveLocalObject(cacheKey(form.slug), state.row);
      removeLocalObject(draftKey(form.slug));
      setMsg("Fiche enregistrée. La page est proprement recousue et ta dernière version est gardée sur cet appareil.", "ok");
      return;
    }

    saveLocalObject(cacheKey(form.slug), form);
    const reason = text(remote.error?.message || remote.error?.details || remote.error?.hint || remote.error) || "sauvegarde distante indisponible";
    setMsg(`Sauvegarde locale faite. Le push distant n’a pas répondu proprement pour le moment : ${reason}.`, "bad");
  }

  function regenerateSlug() {
    const seed = text(els.display_name.value) || text(els.trade.value) || state.slug || `build-${Date.now()}`;
    const newSlug = slugifyHuman(seed);
    els.slug.value = newSlug;
    state.slug = newSlug;
    if (!els.profile_url.value || els.profile_url.value === inferredProfileUrl()) {
      els.profile_url.value = inferredProfileUrl();
    }
    saveDraft();
    setMsg("Identifiant régénéré. Vérifie-le avant d’enregistrer.");
  }

  async function copyProfileLink() {
    const url = inferredProfileUrl();
    if (!url) {
      setMsg("Aucun lien disponible pour le moment.", "bad");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setMsg("Lien copié.", "ok");
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = url;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      setMsg("Lien copié.", "ok");
    }
  }

  function openProfileLink() {
    const url = inferredProfileUrl();
    if (!url) {
      setMsg("Ajoute ou génère d’abord un lien de fiche.", "bad");
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  function openListing() {
    const url = listingUrl();
    window.open(url, "_blank", "noopener");
  }

  function bindUi() {
    els.btnBack.addEventListener("click", () => {
      window.location.href = dashboardUrl();
    });

    els.btnSave.addEventListener("click", saveProfile);
    els.btnReSlug.addEventListener("click", regenerateSlug);
    els.btnCopyLink.addEventListener("click", copyProfileLink);
    els.btnOpenLink.addEventListener("click", openProfileLink);
    els.btnOpenListing.addEventListener("click", openListing);

    IDS.forEach((id) => {
      const el = els[id];
      if (!el) return;
      el.addEventListener("input", scheduleDraftSave);
      el.addEventListener("change", scheduleDraftSave);
    });

    window.addEventListener("beforeunload", () => {
      try {
        saveDraft();
      } catch (_) {}
    });
  }

  async function init() {
    bindElements();
    bindUi();
    setButtonsDisabled(true);
    setGuardStatus("Vérification…");

    if (!window.DIGIY_GUARD || typeof window.DIGIY_GUARD.ready !== "function") {
      closeAccess("Guard absent");
      setMsg(`Le guard BUILD n’est pas chargé. Ouvre ton accès par PIN ou vérifie le fichier guard.js. Besoin d’aide : <a href="${supportUrl()}" target="_blank" rel="noopener">support</a>.`, "bad");
      return;
    }

    try {
      const session = await window.DIGIY_GUARD.ready();

      state.slug = normSlug(session?.slug || window.DIGIY_GUARD.getSlug?.() || "");
      state.phone = normPhone(session?.phone || window.DIGIY_GUARD.getPhone?.() || "");
      state.owner_id = session?.owner_id || window.DIGIY_GUARD.getOwnerId?.() || null;
      state.access_ok = !!(session && session.access_ok && state.slug);

      if (!state.access_ok) {
        closeAccess("Accès fermé");
        setMsg(`Session absente ou fermée. Reviens par le PIN pour ouvrir ta fiche. Besoin d’aide : <a href="${supportUrl()}" target="_blank" rel="noopener">support</a>.`, "bad");
        return;
      }

      openAccess();
      setButtonsDisabled(false);

      try {
        sessionStorage.setItem("digiy_build_slug", state.slug);
        sessionStorage.setItem("digiy_build_last_slug", state.slug);
        localStorage.setItem("digiy_build_last_slug", state.slug);
        if (state.phone) {
          sessionStorage.setItem("digiy_build_phone", state.phone);
          localStorage.setItem("digiy_build_phone", state.phone);
        }
      } catch (_) {}

      fillDefaults();
      await loadProfile();
    } catch (error) {
      console.error("BUILD profile init error", error);
      closeAccess("Erreur d’ouverture");
      setMsg(`Erreur d’ouverture de la fiche. Vérifie ton guard ou ton profile.js. Besoin d’aide : <a href="${supportUrl()}" target="_blank" rel="noopener">support</a>.`, "bad");
    }
  }

  window.DIGIY_BUILD_PROFILE = {
    state,
    save: saveProfile,
    load: loadProfile,
    getPublicUrl: inferredProfileUrl,
    getListingUrl: listingUrl
  };

  document.addEventListener("DOMContentLoaded", init);
})();
