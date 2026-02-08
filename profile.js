(() => {
  "use strict";

  const MODULE = "build";
  const PAY_URL = "https://beauville.github.io/commencer-a-payer/?module=BUILD&offre=BUILD";

  const gs = document.getElementById("guard_status");
  const msg = document.getElementById("msg");
  const $ = (id) => document.getElementById(id);

  let CURRENT_SESSION = null;
  let EXISTING_ROW = null;

  function setMsg(t, ok=true){
    if(!msg) return;
    msg.innerHTML = `Statut : <span class="${ok ? 'ok':'bad'}">${t}</span>`;
  }

  function slugify(str){
    return String(str||"")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/(^-|-$)/g,"")
      .trim() || ("pro-" + Math.random().toString(16).slice(2,8));
  }

  function parseTags(raw){
    const s = String(raw||"").trim();
    if(!s) return null;
    if(s.startsWith("[") && s.endsWith("]")){
      try{
        const a = JSON.parse(s);
        return Array.isArray(a) ? a.map(x=>String(x).trim()).filter(Boolean) : null;
      }catch(_){}
    }
    return s.split(",").map(x=>x.trim()).filter(Boolean);
  }

  function getSb(){
    return window.DIGIY_GUARD?.getSb?.() || null;
  }

  function computePublicLink(row){
    // Si ton profil_url existe -> c’est le lien à partager
    const profileUrl = (row?.profile_url || "").trim();
    if(profileUrl) return profileUrl;

    // Sinon, fallback "slug" (à adapter si tu as une route)
    // Exemple: /build/p/<slug>
    const slug = (row?.slug || "").trim();
    if(slug) return `./p/${encodeURIComponent(slug)}`;

    return "";
  }

  async function loadExisting(owner_id){
    const sb = getSb();
    if(!sb) return;

    const { data, error } = await sb
      .from("digiy_build_public_profiles")
      .select("*")
      .eq("owner_id", owner_id)
      .maybeSingle();

    if(error){
      console.warn("loadExisting err:", error);
      setMsg("Impossible de charger la fiche (voir console).", false);
      return;
    }

    EXISTING_ROW = data || null;
    if(!data){
      setMsg("Aucune fiche existante — tu peux en créer une ✅", true);
      // slug auto proposé
      $("slug").value = slugify($("display_name").value || "");
      return;
    }

    // hydrate form
    $("display_name").value = data.display_name || "";
    $("city").value = data.city || "";
    $("trade").value = data.trade || "";
    $("region").value = data.region || "petite-cote";
    $("sector").value = data.sector || "multi";
    $("whatsapp").value = data.whatsapp || "";
    $("phone").value = data.phone || "";
    $("bio").value = data.bio || "";
    $("photo_url").value = data.photo_url || "";
    $("profile_url").value = data.profile_url || "";
    $("badge").value = data.badge || "";
    $("hub_badge").value = data.hub_badge || "";
    $("price_label").value = data.price_label || "";
    $("priority").value = Number(data.priority ?? 1);
    $("is_published").value = String(!!data.is_published);
    $("slug").value = data.slug || slugify(data.display_name || "");

    try{
      $("tags").value = Array.isArray(data.tags) ? JSON.stringify(data.tags) : "";
    }catch(_){}

    setMsg("Fiche existante chargée ✅ (tu peux modifier et enregistrer)", true);
  }

  function buildPayload(session){
    const display_name = $("display_name").value.trim();
    const city = $("city").value.trim();
    const trade = $("trade").value.trim();
    const region = $("region").value.trim();
    const sector = $("sector").value.trim();
    const whatsapp = $("whatsapp").value.trim().replace(/\s+/g,"");
    const phone = $("phone").value.trim();
    const bio = $("bio").value.trim();
    const photo_url = $("photo_url").value.trim();
    const profile_url = $("profile_url").value.trim();
    const badge = $("badge").value.trim();
    const hub_badge = $("hub_badge").value.trim();
    const price_label = $("price_label").value.trim();
    const priority = Math.max(0, Math.min(100, parseInt($("priority").value,10) || 1));
    const is_published = ($("is_published").value === "true");
    const tags = parseTags($("tags").value);

    if(!display_name) throw new Error("Nom affiché requis");
    if(!whatsapp) throw new Error("WhatsApp requis (ex: 22177...)");

    // ✅ slug stable : si fiche existe et a un slug => on le garde
    let slug = $("slug").value.trim();
    if(EXISTING_ROW?.slug) slug = EXISTING_ROW.slug;
    if(!slug) slug = slugify(display_name);

    return {
      owner_id: session.owner_id,
      slug,
      display_name,
      trade: trade || null,
      sector: sector || null,
      region: region || null,
      city: city || null,
      address: null,
      whatsapp,
      phone: phone || null,
      photo_url: photo_url || null,
      bio: bio || null,
      tags: tags || null,
      profile_url: profile_url || null,
      is_published,
      is_active: true,
      is_verified: true,
      priority,
      badge: badge || null,
      hub_badge: hub_badge || "✅ PARTENAIRE BUILD",
      price_label: price_label || "0% commission"
    };
  }

  async function saveProfile(){
    const sb = getSb();
    if(!sb) return setMsg("Supabase non dispo (guard)", false);
    if(!CURRENT_SESSION?.owner_id) return setMsg("Session invalide", false);

    try{
      const payload = buildPayload(CURRENT_SESSION);

      setMsg("Enregistrement…", true);

      let res = await sb
        .from("digiy_build_public_profiles")
        .upsert(payload, { onConflict: "owner_id" })
        .select("*")
        .maybeSingle();

      // fallback slug
      if(res?.error){
        const err = String(res.error.message || "").toLowerCase();
        if(err.includes("onconflict") || err.includes("constraint") || err.includes("duplicate")){
          res = await sb
            .from("digiy_build_public_profiles")
            .upsert(payload, { onConflict: "slug" })
            .select("*")
            .maybeSingle();
        }
      }

      if(res?.error){
        console.error(res.error);
        return setMsg("Erreur: " + (res.error.message || res.error), false);
      }

      EXISTING_ROW = res.data || payload;

      const link = computePublicLink(EXISTING_ROW);
      setMsg(`OK ✅ fiche enregistrée • publié=${payload.is_published ? "oui" : "non"}${link ? " • lien prêt" : ""}`, true);

    }catch(e){
      setMsg(e?.message || "Erreur", false);
    }
  }

  function reSlug(){
    const dn = $("display_name").value.trim();
    const newSlug = slugify(dn || "partenaire-build");
    $("slug").value = newSlug;
    // on force le remplacement (si tu cliques “régénérer”, on accepte de changer)
    if(EXISTING_ROW) EXISTING_ROW.slug = newSlug;
    setMsg("Slug régénéré ✅ (pense à Enregistrer)", true);
  }

  async function copyLink(){
    const link = computePublicLink(EXISTING_ROW) || "";
    if(!link) return setMsg("Pas de lien pour l’instant (enregistre d’abord).", false);
    try{
      await navigator.clipboard.writeText(link);
      setMsg("Lien copié ✅", true);
    }catch(_){
      setMsg("Copie impossible (navigateur). Lien: " + link, true);
    }
  }

  function openLink(){
    const link = computePublicLink(EXISTING_ROW) || "";
    if(!link) return setMsg("Pas de lien (enregistre d’abord).", false);
    window.open(link, "_blank", "noopener");
  }

  async function init(){
    if(!window.DIGIY_GUARD || typeof window.DIGIY_GUARD.boot !== "function"){
      if(gs) gs.textContent = "❌ guard.js non chargé";
      return;
    }

    const guardRes = await window.DIGIY_GUARD.boot({
      module: MODULE,
      dashboard: "./index.html",
      login: "./pin.html",
      pay: PAY_URL,
      requireSlug: true,
      checkSubscription: true
    });

    if(!guardRes?.ok){
      if(gs) gs.textContent = "❌ Accès refusé";
      return;
    }

    const session = window.DIGIY_GUARD.getSession?.() || null;
    if(!session?.owner_id){
      if(gs) gs.textContent = "❌ Session invalide";
      location.replace("./pin.html");
      return;
    }

    CURRENT_SESSION = session;
    document.documentElement.classList.add("access-ok");

    if(gs){
      gs.textContent = "✅ PRO OK";
      setTimeout(() => gs.style.display = "none", 700);
    }

    setMsg("Prêt ✅ (chargement de ta fiche…)", true);
    await loadExisting(session.owner_id);

    $("btnSave").addEventListener("click", saveProfile);
    $("btnReSlug").addEventListener("click", reSlug);
    $("btnCopyLink").addEventListener("click", copyLink);
    $("btnOpenLink").addEventListener("click", openLink);

    $("btnBack").addEventListener("click", () => {
      try{
        if(window.DIGIY_GUARD?.go) return window.DIGIY_GUARD.go("./index.html", "assign");
      }catch(_){}
      location.href = "./index.html";
    });
  }

  init();
})();
