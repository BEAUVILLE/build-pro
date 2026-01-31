/* =========================================
   DIGIY GUARD — Universel PRO
========================================= */

(function(){

  const SESSION_KEY = "DIGIY_ACCESS"; // session universelle
  const MAX_AGE = 1000 * 60 * 60 * 8; // 8h

  function getSession(){
    try{
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    }catch(_){
      return null;
    }
  }

  function kick(){
    // retour porte PIN
    const slug = new URL(location.href).searchParams.get("slug");
    location.href = "./pin.html" + (slug ? "?slug="+encodeURIComponent(slug) : "");
  }

  const s = getSession();

  if(!s || !s.slug || !s.owner_id){
    return kick();
  }

  if(Date.now() - (s.ts||0) > MAX_AGE){
    localStorage.removeItem(SESSION_KEY);
    return kick();
  }

  // ✅ session valide : pro continue
  console.log("🦅 DIGIY GUARD OK", s.slug);

})();
