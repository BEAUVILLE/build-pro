:root{
  --bg:#061b14;
  --bg2:#0a2b1f;
  --line:rgba(255,255,255,.14);
  --line-soft:rgba(255,255,255,.08);
  --text:#eafff1;
  --muted:rgba(234,255,241,.72);
  --gold:#facc15;
  --green:#22c55e;
  --blue:#38bdf8;
  --bad:#fb7185;
  --ok:#22c55e;
  --r:20px;
  --r-sm:14px;
  --shadow:0 18px 55px rgba(0,0,0,.45);
  --shadow-soft:0 10px 28px rgba(0,0,0,.24);
}

*{box-sizing:border-box}

html,body{
  max-width:100%;
  overflow-x:hidden;
}

body{
  margin:0;
  min-height:100vh;
  font-family:Outfit,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  background:
    radial-gradient(900px 500px at 10% -10%, rgba(34,197,94,.20), transparent 60%),
    radial-gradient(900px 500px at 110% 0%, rgba(250,204,21,.14), transparent 55%),
    linear-gradient(180deg, #04140f 0%, var(--bg) 60%, #04140f 100%);
  color:var(--text);
  padding:18px;
}

#guard_status{
  position:fixed;
  top:16px;
  right:16px;
  padding:10px 14px;
  background:rgba(0,0,0,.88);
  color:#fff;
  border-radius:12px;
  font-weight:900;
  font-size:13px;
  z-index:9999;
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 12px 28px rgba(0,0,0,.28);
  backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
}

.app{display:none;}
html.access-ok .app{display:block;}

.wrap{
  max-width:920px;
  margin:0 auto;
  padding:10px 0 44px;
}

.card{
  background:
    linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid var(--line);
  border-radius:var(--r);
  padding:20px;
  box-shadow:var(--shadow);
  backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
}

.hero{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
  flex-wrap:wrap;
}

.hero-brand{
  display:flex;
  align-items:flex-start;
  gap:14px;
  flex:1;
  min-width:260px;
}

.hero-logo{
  width:72px;
  height:72px;
  border-radius:18px;
  object-fit:cover;
  background:#fff;
  border:1px solid rgba(250,204,21,.24);
  box-shadow:0 12px 30px rgba(0,0,0,.20);
  flex:0 0 auto;
}

.hero-kicker{
  font-size:11px;
  font-weight:1000;
  letter-spacing:.12em;
  text-transform:uppercase;
  color:rgba(234,255,241,.68);
  margin:2px 0 6px;
}

.head-actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

h1{
  margin:0;
  font-size:30px;
  line-height:1.08;
  letter-spacing:.2px;
  background:linear-gradient(135deg, var(--green), var(--gold));
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  font-weight:1000;
}

.sub{
  margin:8px 0 0;
  color:var(--muted);
  line-height:1.55;
  font-size:15px;
  font-weight:850;
  max-width:760px;
}

.row{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}

@media(max-width:720px){
  .row{
    grid-template-columns:1fr;
  }
}

label{
  display:block;
  font-size:12px;
  font-weight:950;
  color:rgba(234,255,241,.85);
  margin:10px 0 6px;
  letter-spacing:.2px;
}

input,
textarea,
select{
  width:100%;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(0,0,0,.18);
  padding:12px 12px;
  color:var(--text);
  outline:none;
  font:inherit;
  transition:border-color .18s ease, box-shadow .18s ease, background .18s ease, transform .18s ease;
  font-family:inherit;
}

input,
select{
  font-weight:900;
}

textarea{
  min-height:96px;
  resize:vertical;
  font-weight:850;
  line-height:1.5;
}

input::placeholder,
textarea::placeholder{
  color:rgba(234,255,241,.40);
}

input:focus,
textarea:focus,
select:focus{
  border-color:rgba(250,204,21,.40);
  box-shadow:0 0 0 3px rgba(250,204,21,.10);
  background:rgba(0,0,0,.24);
}

input[readonly],
textarea[readonly]{
  opacity:.92;
  background:rgba(255,255,255,.04);
}

.hr{
  height:1px;
  background:rgba(255,255,255,.12);
  margin:16px 0;
}

.actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding:13px 16px;
  border-radius:14px;
  font-weight:1000;
  text-decoration:none;
  border:1px solid transparent;
  cursor:pointer;
  font-size:15px;
  transition:all .2s ease;
  flex:1;
  min-width:210px;
  box-shadow:var(--shadow-soft);
  font-family:inherit;
}

.primary{
  background:linear-gradient(135deg, rgba(34,197,94,.95), rgba(16,185,129,.85));
  color:#042012;
  border:none;
}

.secondary{
  background:rgba(250,204,21,.14);
  border:1px solid rgba(250,204,21,.25);
  color:var(--text);
}

.ghost{
  background:rgba(255,255,255,.08);
  border:1px solid var(--line);
  color:var(--text);
}

.primary:hover,
.secondary:hover,
.ghost:hover{
  transform:translateY(-2px);
}

.primary:hover{
  box-shadow:0 14px 34px rgba(34,197,94,.20);
}

.secondary:hover{
  border-color:rgba(250,204,21,.45);
}

.ghost:hover{
  border-color:rgba(255,255,255,.24);
}

.primary:disabled,
.secondary:disabled,
.ghost:disabled,
.btn[disabled]{
  opacity:.56;
  cursor:not-allowed;
  transform:none;
  box-shadow:none;
}

.note{
  margin-top:14px;
  font-size:13px;
  color:rgba(234,255,241,.76);
  line-height:1.55;
  padding:12px;
  background:rgba(0,0,0,.20);
  border-radius:12px;
  border:1px solid rgba(255,255,255,.08);
  font-weight:850;
}

.top-note{
  margin-top:16px;
}

.ok{
  color:#bbf7d0;
  font-weight:1000;
}

.bad{
  color:#fecaca;
  font-weight:1000;
}

.hint{
  margin-top:6px;
  font-size:12px;
  color:rgba(234,255,241,.60);
  font-weight:850;
  line-height:1.45;
}

a{
  color:inherit;
}

@media(max-width:640px){
  body{
    padding:14px;
  }

  #guard_status{
    top:12px;
    right:12px;
    left:12px;
    text-align:center;
  }

  .wrap{
    padding-top:58px;
  }

  .card{
    padding:16px;
  }

  .hero-logo{
    width:64px;
    height:64px;
    border-radius:16px;
  }

  h1{
    font-size:25px;
  }

  .sub{
    font-size:14px;
  }

  .head-actions,
  .actions{
    width:100%;
  }

  .head-actions .btn,
  .actions .btn{
    min-width:100%;
  }
}
