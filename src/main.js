import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- initialisation Supabase ---
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase        = createClient(supabaseUrl, supabaseAnonKey);

// --- helpers ---
export function showDonate() {
  alert(
`🎓 Soutenez notre mission éducative !
Cette bibliothèque en ligne fonctionne grâce à votre générosité.
Vous pouvez faire un don via Orange Money au +226 77 60 02 64.
Chaque contribution compte, merci !`
  );
}

// --- page landing (index) : aucune action nécessaire ---

// --- inscription ---
export function initSignup() {
  const form = document.getElementById('signup-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    if (f.password.value !== f.confirmPwd.value) {
      return alert("Les mots de passe ne correspondent pas.");
    }
    const { error } = await supabase.auth.signUp({
      email: f.email.value,
      password: f.password.value,
      options: { data: { full_name: f.fullName.value.trim() } }
    });
    if (error) return alert(error.message);
    window.location.href = 'connexion.html';
  });
}

// --- connexion ---
export function initLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const { error } = await supabase.auth.signInWithPassword({
      email: f.email.value,
      password: f.password.value
    });
    if (error) return alert(error.message);
    window.location.href = 'accueil.html';
  });
}

// --- ajouter un document ---
export function initAddDoc() {
  const form = document.getElementById('add-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const file = f.file.files[0];
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;
    // upload
    const { error: uploadError } = await supabase
      .storage.from('documents').upload(fileName, file);
    if (uploadError) return alert(`Erreur upload : ${uploadError.message}`);
    // public URL
    const { data:{ publicUrl } } = supabase
      .storage.from('documents').getPublicUrl(fileName);
    // insert
    const { error: insertError } = await supabase
      .from('bibliomine_table')
      .insert([{
        titre:       f.titre.value.trim(),
        auteur:      f.auteur.value.trim(),
        annee:       Number(f.annee.value),
        niveau:      f.niveau.value.trim(),
        fichier_url: publicUrl
      }]);
    if (insertError) return alert(`Erreur enregistrement : ${insertError.message}`);
    window.location.href = 'bibliotheque.html';
  });
}

// --- accueil ---
async function loadRecent() {
  const { data, error } = await supabase
    .from('bibliomine_table')
    .select('titre,auteur,annee,fichier_url')
    .order('annee',{ ascending:false })
    .limit(3);
  const docs = data || [];
  const grid = document.getElementById('recent-grid');
  if (!docs.length) {
    grid.innerHTML = '<p style="text-align:center;color:#ddd;">Aucun document récent.</p>';
    return;
  }
  grid.innerHTML = docs.map(d => `
    <div class="doc-card">
      <h3>${d.titre}</h3>
      <div class="doc-meta">${d.auteur} — ${d.annee}</div>
      <div class="doc-actions">
        <a href="${d.fichier_url}" target="_blank">Télécharger</a>
      </div>
    </div>
  `).join('');
}
export async function initAccueil() {
  // auth‑guard
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) return window.location.href = 'connexion.html';
  // logout & donate
  document.querySelector('.btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'connexion.html';
  });
  document.querySelector('.link-donate').addEventListener('click', showDonate);
  // load
  loadRecent();
}

// --- bibliothèque ---
let docs = [], page = 1, pageSize = 9;
function renderLibrary() {
  const gridEl = document.getElementById('grid');
  const pagEl  = document.getElementById('pagination');
  const term   = document.getElementById('search').value.toLowerCase();
  const y      = document.getElementById('filter-year').value;
  const n      = document.getElementById('filter-niveau').value;

  let filtered = docs.filter(d => {
    const byTerm = d.titre.toLowerCase().includes(term);
    const byYear = y ? d.annee.toString() === y : true;
    const byNiv  = n ? d.niveau === n : true;
    return byTerm && byYear && byNiv;
  });

  const total = filtered.length;
  const pages = Math.ceil(total / pageSize);
  if (page > pages) page = pages || 1;
  const slice = filtered.slice((page-1)*pageSize, (page-1)*pageSize+pageSize);

  gridEl.innerHTML = slice.map(d => `
    <div class="doc-card">
      <h2>${d.titre}</h2>
      <div class="doc-meta">${d.auteur} — ${d.annee}</div>
      <div class="doc-actions">
        <a href="${d.fichier_url}" target="_blank">Télécharger</a>
      </div>
    </div>
  `).join('');

  pagEl.innerHTML = '';
  if (pages>1) {
    const mk = (txt,p) => {
      const a = document.createElement('a');
      a.textContent = txt; a.href = '#';
      if (p===page) a.classList.add('active');
      a.onclick = e => { e.preventDefault(); page=p; renderLibrary(); };
      return a;
    };
    pagEl.append(mk('‹', page>1?page-1:1));
    for(let i=1;i<=pages;i++) pagEl.append(mk(i,i));
    pagEl.append(mk('›', page<pages?page+1:pages));
  }
}
export async function initBibliotheque() {
  // auth‑guard
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) return window.location.href = 'connexion.html';
  // fetch
  const { data, error } = await supabase
    .from('bibliomine_table')
    .select('*')
    .order('annee',{ ascending:false });
  docs = error||!data.length
    ? [
        {titre:'Rapport A', auteur:'Dupont', annee:2024, niveau:'Master', fichier_url:'#'},
        {titre:'Étude B',   auteur:'Martin', annee:2023, niveau:'Licence', fichier_url:'#'},
        {titre:'Analyse C', auteur:'Durand', annee:2025, niveau:'Doctorat', fichier_url:'#'}
      ]
    : data;
  // remplir filtres
  const yearSel = document.getElementById('filter-year');
  const nivSel  = document.getElementById('filter-niveau');
  [...new Set(docs.map(d=>d.annee))].sort((a,b)=>b-a)
    .forEach(y=> yearSel.append(new Option(y,y)) );
  [...new Set(docs.map(d=>d.niveau))]
    .forEach(n=> nivSel.append(new Option(n,n)) );
  // listeners
  document.getElementById('search').addEventListener('input',()=>{ page=1; renderLibrary() });
  yearSel.addEventListener('input',()=>{ page=1; renderLibrary() });
  nivSel .addEventListener('input',()=>{ page=1; renderLibrary() });
  renderLibrary();
}

// --- bootstrap ---
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  switch(page) {
    case 'signup':      initSignup();       break;
    case 'login':       initLogin();        break;
    case 'add':         initAddDoc();       break;
    case 'accueil':     initAccueil();      break;
    case 'bibliotheque':initBibliotheque(); break;
    default: /* landing */                 break;
  }
});
