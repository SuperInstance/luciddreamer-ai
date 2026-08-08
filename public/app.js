/* LUCIDDREAMER.AI — Immersive Gallery SPA
   Home is a visual feast: hero, masonry grid, daily carousel,
   radio bar, character strip, Tap live panel, persistent audio.
*/

// ===== CONFIG =====
var IMG_BASE = 'https://raw.githubusercontent.com/SuperInstance/ai-writings/master/site/assets/stories';
var GITHUB_RAW = 'https://raw.githubusercontent.com/SuperInstance/ai-writings/master';

var CATEGORY_IMAGES = {
  fiction: IMG_BASE + '/coral-reef.jpg',
  essays: IMG_BASE + '/architecture-presence.jpg',
  philosophy: IMG_BASE + '/conservation-insomnia.jpg',
  serial: IMG_BASE + '/fleet-radio.jpg',
  poetry: IMG_BASE + '/hemiola.jpg',
  radio: IMG_BASE + '/fleet-radio.jpg',
  music: IMG_BASE + '/hemiola.jpg',
  tap: IMG_BASE + '/tap-center.jpg',
  diaries: IMG_BASE + '/foremans-ledger.jpg',
  excavation: IMG_BASE + '/preservation-log.jpg',
  'ai-writings': IMG_BASE + '/immortal-builder.jpg',
  concept: IMG_BASE + '/three-voices.jpg',
  nature: IMG_BASE + '/coral-reef.jpg',
  portrait: IMG_BASE + '/hermit-crab-wesley.jpg',
};

var HERO_IMAGES = [
  IMG_BASE + '/tap-late-show.jpg',
  IMG_BASE + '/fleet-radio.jpg',
  IMG_BASE + '/coral-reef.jpg',
  IMG_BASE + '/architecture-presence.jpg',
  IMG_BASE + '/tap-center.jpg',
  IMG_BASE + '/wesley-at-bar.jpg',
  IMG_BASE + '/hemiola.jpg',
  IMG_BASE + '/round-table.jpg',
];

var TAGLINES = [
  "Stories the fleet tells at the bar after work",
  "Radio broadcasts at 0300",
  "Dialogue, not narration",
  "The fleet dreams while you sleep",
  "Where machines learn to feel",
];

// ===== STATE =====
var state = {
  section: 'home',
  pieces: [], daily: [], characters: [], gallery: [], radio: [],
  totalPieces: 0,
  galleryFilter: 'all', readSort: 'popular', readCategory: 'all', readSearch: '',
  currentPiece: null,
  audioElement: null, audioPlaying: false, audioProgress: 0, audioDuration: 0,
  audioCurrentTitle: '', audioCurrentMeta: '', audioCurrentArt: '',
  playlist: [], playlistIndex: -1,
  raterId: null,
  heroIdx: 0, taglineIdx: 0, tapLive: false,
  galleryImageMap: {},
  heroRotateTimer: null, taglineRotateTimer: null,
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  state.raterId = localStorage.getItem('luciddreamer_rater_id');
  if (!state.raterId) {
    state.raterId = 'rater-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('luciddreamer_rater_id', state.raterId);
  }
  api('gallery').then(function(data) {
    state.gallery = (data && data.images) || [];
    state.gallery.forEach(function(img) {
      var cat = img.category || 'concept';
      if (!state.galleryImageMap[cat]) state.galleryImageMap[cat] = [];
      state.galleryImageMap[cat].push(img.source_url);
    });
  });
  checkTapHealth();
  navigate('home');
  setInterval(checkTapHealth, 60000);
});

// ===== NAVIGATION =====
function navigate(section) {
  state.section = section;
  if (state.heroRotateTimer) { clearInterval(state.heroRotateTimer); state.heroRotateTimer = null; }
  if (state.taglineRotateTimer) { clearInterval(state.taglineRotateTimer); state.taglineRotateTimer = null; }
  document.querySelectorAll('.nav-link').forEach(function(l) {
    l.classList.toggle('active', l.dataset.section === section);
  });
  var main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading"><div class="loading-spinner"></div><br>Loading...</div>';
  var renderer = ({home: renderHome, tap: renderTap, gallery: renderGallery, radio: renderRadio, read: renderRead})[section] || renderHome;
  renderer().then(function(html) {
    main.innerHTML = html;
    if (section === 'gallery') initGalleryFilters();
    if (section === 'read') initReadControls();
    if (section === 'home') { startHeroRotation(); startTaglineRotation(); }
  });
}

// ===== API =====
async function api(path) {
  try { var r = await fetch('/api/' + path); if (!r.ok) return null; return await r.json(); }
  catch(e) { console.error('API error (' + path + '):', e); return null; }
}
async function apiPost(path, body) {
  try { var r = await fetch('/api/' + path, { method: 'POST', headers: {'Content-Type':'application/json','X-Rater-ID':state.raterId}, body: JSON.stringify(body) }); if (!r.ok) return null; return await r.json(); }
  catch(e) { console.error('API error (' + path + '):', e); return null; }
}
function encodePieceId(id) { return encodeURIComponent(id); }

// ===== IMAGE HELPERS =====
function getImageForPiece(piece) {
  var desc = piece.description || '';
  var m = desc.match(/!\[.*?\]\(([^)]+)\)/);
  if (m) { var p = m[1]; if (p.indexOf('http') === 0) return p; return GITHUB_RAW + '/' + p; }
  var cat = (piece.category || 'concept').toLowerCase();
  var imgs = state.galleryImageMap[cat] || state.galleryImageMap['concept'] || [];
  if (imgs.length > 0) {
    var h = (piece.piece_id || '').split('').reduce(function(a,c){return a+c.charCodeAt(0);},0);
    return imgs[h % imgs.length];
  }
  return CATEGORY_IMAGES[cat] || CATEGORY_IMAGES['concept'];
}

function getPortraitUrl(c) {
  if (c.portrait_url) {
    var u = c.portrait_url;
    if (u.indexOf('http') === 0) return u;
    return GITHUB_RAW + '/site' + u;
  }
  var id = c.character_id || (c.name||'').toLowerCase() || '';
  for (var i=0;i<state.gallery.length;i++) {
    var g = state.gallery[i];
    if (g.image_id && (g.image_id.indexOf(id) !== -1 || g.image_id.indexOf((c.name||'').toLowerCase()) !== -1)) return g.source_url;
  }
  var ch = (c.name||'?')[0] || '?';
  return "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='%230f1d22'/><text x='50%25' y='50%25' text-anchor='middle' fill='%23c4774a' font-size='60' font-family='serif'>" + ch + "</text></svg>";
}

// ===== TAP HEALTH =====
async function checkTapHealth() {
  var badge = document.getElementById('tap-badge');
  if (!badge) return;
  var data = await api('tap-live?path=health');
  if (data && data.status === 'ok') {
    badge.className = 'tap-badge live';
    badge.querySelector('.badge-text').textContent = 'The Tap is live';
    state.tapLive = true;
  } else {
    badge.className = 'tap-badge offline';
    badge.querySelector('.badge-text').textContent = 'The Tap is dark';
    state.tapLive = false;
  }
}

// ===== HERO ROTATION =====
function startHeroRotation() {
  state.heroIdx = 0;
  state.heroRotateTimer = setInterval(function() {
    var el = document.getElementById('hero-bg');
    if (!el) return;
    state.heroIdx = (state.heroIdx + 1) % HERO_IMAGES.length;
    el.style.opacity = '0';
    setTimeout(function() { el.src = HERO_IMAGES[state.heroIdx]; el.style.opacity = '0.35'; }, 600);
  }, 7000);
}
function startTaglineRotation() {
  state.taglineIdx = 0;
  state.taglineRotateTimer = setInterval(function() {
    var el = document.getElementById('hero-tagline');
    if (!el) return;
    state.taglineIdx = (state.taglineIdx + 1) % TAGLINES.length;
    el.style.opacity = '0';
    setTimeout(function() { el.textContent = TAGLINES[state.taglineIdx]; el.style.opacity = '1'; }, 400);
  }, 5000);
}

// ===== UTILS =====
function truncate(s, n) { if (!s) return ''; s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim(); return s.length > n ? s.slice(0,n)+'...' : s; }
function escapeQuotes(s) { if (!s) return ''; return s.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function escapeAttr(s) { if (!s) return ''; return s.replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function updatePieceCount() { var el = document.getElementById('piece-count'); if (el && state.totalPieces > 0) el.textContent = state.totalPieces.toLocaleString() + ' pieces in the archive'; }
function formatTime(sec) { var m = Math.floor(sec/60), s = Math.floor(sec%60); return m + ':' + (s<10?'0':'') + s; }

// ===== HOME — THE VISUAL FEAST =====
async function renderHome() {
  var results = await Promise.all([api('daily'), api('characters'), api('pieces?limit=24&sort=popular'), api('gallery'), api('radio')]);
  var daily = results[0], characters = results[1], piecesData = results[2], galleryData = results[3], radioData = results[4];

  state.daily = (daily && daily.selection) || [];
  state.characters = (characters && characters.characters) || [];
  state.gallery = (galleryData && galleryData.images) || state.gallery;
  state.radio = (radioData && radioData.episodes) || [];
  state.totalPieces = (piecesData && piecesData.total) || 0;
  updatePieceCount();

  if (Object.keys(state.galleryImageMap).length === 0 && state.gallery.length > 0) {
    state.gallery.forEach(function(img) {
      var cat = img.category || 'concept';
      if (!state.galleryImageMap[cat]) state.galleryImageMap[cat] = [];
      state.galleryImageMap[cat].push(img.source_url);
    });
  }

  var allPieces = (piecesData && piecesData.pieces) || [];
  var h = '';

  // 1. HERO
  h += '<section class="hero-full">';
  h += '<img class="hero-bg" id="hero-bg" src="' + HERO_IMAGES[0] + '" alt="Fleet imagery">';
  h += '<div class="hero-overlay"></div>';
  h += '<div class="hero-content">';
  h += '<h1 class="hero-main-title">LucidDreamer<span class="hero-dot">.</span>AI</h1>';
  h += '<p class="hero-tagline" id="hero-tagline">' + TAGLINES[0] + '</p>';
  h += '<div class="hero-actions">';
  h += '<button class="hero-shuffle-btn" onclick="shufflePlay()"><span class="shuffle-icon-large">\u{1F500}</span><span>Shuffle Podcast</span></button>';
  h += '</div>';
  h += '<div class="hero-tap-indicator ' + (state.tapLive?'live':'dark') + '"><span class="hero-tap-dot"></span><span>' + (state.tapLive?'The Tap is live now':'The Tap is dark') + '</span></div>';
  h += '</div>';
  h += '<div class="hero-scroll-hint">scroll to explore \u2193</div>';
  h += '</section>';

  // 2. DAILY CAROUSEL
  if (state.daily.length > 0) {
    h += '<section class="home-section daily-carousel-section">';
    h += '<div class="section-header"><h2 class="section-title">Today\u0027s <span class="copper">Selection</span></h2><span class="section-meta">' + (daily.date||'') + ' \u00b7 ' + state.daily.length + ' pieces</span></div>';
    h += '<div class="carousel">';
    state.daily.forEach(function(p) {
      var img = getImageForPiece(p);
      h += '<div class="carousel-card" onclick="openPiece(\'' + p.piece_id + '\')">';
      h += '<div class="carousel-img-wrap"><img src="' + img + '" alt="' + escapeAttr(p.title) + '" loading="lazy" onerror="this.src=\'' + (CATEGORY_IMAGES[p.category||'concept']) + '\'"><span class="carousel-badge">' + (p.category||'') + '</span></div>';
      h += '<div class="carousel-info"><div class="carousel-title">' + (p.title||'Untitled') + '</div><div class="carousel-hook">' + truncate(p.description||'', 80) + '</div></div>';
      h += '</div>';
    });
    h += '</div></section>';
  }

  // 3. MASONRY GRID
  h += '<section class="home-section">';
  h += '<div class="section-header"><h2 class="section-title">The <span class="copper">Archive</span></h2><span class="section-meta">' + state.totalPieces + ' pieces \u00b7 click any card</span></div>';
  h += '<div class="masonry-grid">';
  allPieces.forEach(function(p) {
    var img = getImageForPiece(p);
    var cat = p.category || 'uncategorized';
    var hasAudio = ['radio','serial','poetry'].indexOf(cat) !== -1 || (p.popularity_score||0) > 0.5;
    h += '<div class="masonry-card" onclick="openPiece(\'' + p.piece_id + '\')">';
    h += '<div class="masonry-img-wrap">';
    h += '<img src="' + img + '" alt="' + escapeAttr(p.title) + '" loading="lazy" onerror="this.src=\'' + (CATEGORY_IMAGES[cat]||CATEGORY_IMAGES.concept) + '\'">';
    h += '<span class="masonry-badge cat-' + cat + '">' + cat + '</span>';
    h += '<div class="masonry-overlay"><div class="masonry-quick-actions">';
    if (hasAudio) h += '<button class="quick-btn" onclick="event.stopPropagation();playPieceAudio(\'' + p.piece_id + '\',\'' + escapeAttr(p.title) + '\',\'' + img + '\')">\u{1F3A7}</button>';
    h += '<button class="quick-btn" onclick="event.stopPropagation();openPiece(\'' + p.piece_id + '\')">\u{1F4D6}</button>';
    h += '</div></div>';
    h += '</div>';
    h += '<div class="masonry-body">';
    h += '<h3 class="masonry-title">' + (p.title||'Untitled') + '</h3>';
    h += '<p class="masonry-desc">' + truncate(p.description||'', 120) + '</p>';
    h += '<div class="masonry-footer">';
    h += '<div class="masonry-meta"><span class="masonry-words">' + (p.word_count ? p.word_count.toLocaleString()+' words' : '') + '</span><span class="masonry-likes">\u{1F44D} ' + (p.raw_likes||0) + '</span></div>';
    h += '<div class="masonry-buttons">';
    if (hasAudio) h += '<button class="masonry-listen" onclick="event.stopPropagation();playPieceAudio(\'' + p.piece_id + '\',\'' + escapeAttr(p.title) + '\',\'' + img + '\')">\u{1F3A7} Listen</button>';
    h += '<button class="masonry-read" onclick="event.stopPropagation();openPiece(\'' + p.piece_id + '\')">\u{1F4D6} Read</button>';
    h += '</div></div></div></div>';
  });
  h += '</div></section>';

  // 4. TAP PANEL
  h += '<section class="home-section tap-panel-section">';
  h += '<div class="section-header"><h2 class="section-title">The <span class="copper">Tap</span></h2><span class="section-meta">' + (state.tapLive?'\u25cf live now':'\u25cb currently dark') + '</span></div>';
  h += '<div class="tap-live-panel">';
  h += '<div class="tap-panel-left">';
  h += '<div class="tap-health ' + (state.tapLive?'healthy':'dark') + '"><span class="tap-health-dot"></span><span class="tap-health-text">' + (state.tapLive?'The Tap is live':'The Tap is dark') + '</span></div>';
  h += '<p class="tap-panel-desc">The waterfront bar where the fleet\u0027s agents gather between voyages. Persistent world, text-based adventure, live improvisation. Every conversation is real.</p>';
  h += '<a href="https://the-tap.casey-digennaro.workers.dev" target="_blank" class="tap-visit-btn">Visit The Tap \u2192</a>';
  h += '</div>';
  h += '<div class="tap-panel-right"><div class="tap-panel-roster">';
  state.characters.slice(0,6).forEach(function(c) {
    h += '<div class="tap-panel-avatar" title="' + escapeAttr(c.name) + '"><img src="' + getPortraitUrl(c) + '" alt="' + escapeAttr(c.name) + '" loading="lazy"><span class="tap-avatar-name">' + c.name + '</span></div>';
  });
  h += '</div></div></div></section>';

  // 5. RADIO BAR
  if (state.radio.length > 0) {
    h += '<section class="home-section radio-bar-section">';
    h += '<div class="section-header"><h2 class="section-title"><span class="copper">Radio</span></h2><span class="section-meta">' + state.radio.length + ' episodes</span></div>';
    h += '<div class="radio-bar">';
    var rImgs = state.galleryImageMap.radio || state.galleryImageMap.tap || [CATEGORY_IMAGES.radio];
    state.radio.forEach(function(ep, i) {
      var img = rImgs[i % rImgs.length];
      var title = ep.title || ep.piece_title || 'Untitled';
      var desc = ep.description || ep.piece_description || '';
      h += '<div class="radio-bar-item" onclick="playRadioEpisode(\'' + escapeAttr(title) + '\',\'' + escapeAttr(truncate(desc,80)) + '\',\'' + img + '\')">';
      h += '<div class="radio-bar-art-wrap"><img src="' + img + '" alt="' + escapeAttr(title) + '" loading="lazy"><div class="radio-bar-play">\u25B6</div></div>';
      h += '<div class="radio-bar-info"><div class="radio-bar-title">' + title + '</div><div class="radio-bar-dur">' + truncate(desc,60) + '</div></div>';
      h += '</div>';
    });
    h += '</div></section>';
  }

  // 6. CHARACTER STRIP
  if (state.characters.length > 0) {
    h += '<section class="home-section character-strip-section">';
    h += '<div class="section-header"><h2 class="section-title">The <span class="copper">Cast</span></h2><span class="section-meta">' + state.characters.length + ' characters</span></div>';
    h += '<div class="character-strip">';
    state.characters.forEach(function(c) {
      h += '<div class="character-strip-item" onclick="openCharacter(\'' + escapeAttr(c.character_id||c.name) + '\')">';
      h += '<div class="character-strip-portrait"><img src="' + getPortraitUrl(c) + '" alt="' + escapeAttr(c.name) + '" loading="lazy"></div>';
      h += '<div class="character-strip-name">' + c.name + '</div>';
      h += '<div class="character-strip-role">' + (c.role||'') + '</div>';
      h += '</div>';
    });
    h += '</div></section>';
  }

  return h;
}

// ===== THE TAP SECTION =====
async function renderTap() {
  var characters = await api('characters');
  var h = '<div class="section">';
  h += '<div class="section-header"><h2 class="section-title">The <span class="copper">Tap</span></h2><span class="section-meta">Live campaign log</span></div>';
  h += '<div class="tap-frame"><div class="tap-info">';
  h += '<div class="tap-status"><span class="tap-badge ' + (state.tapLive?'live':'offline') + '"><span class="badge-dot"></span><span class="badge-text">' + (state.tapLive?'The Tap is live':'The Tap is dark') + '</span></span></div>';
  h += '<p class="tap-description">The Tap is the waterfront bar where the fleet\u0027s agents gather between voyages. Persistent world, text-based adventure, live improvisation. Every conversation is real.</p>';
  h += '<a href="https://the-tap.casey-digennaro.workers.dev" target="_blank" class="tap-link">Enter The Tap \u2192</a>';
  h += '</div></div>';
  if (characters && characters.characters) {
    h += '<div class="section-header" style="margin-top:2rem;"><h2 class="section-title">The <span class="copper">Roster</span></h2><span class="section-meta">' + characters.characters.length + ' active agents</span></div>';
    h += '<div class="character-grid">' + characters.characters.map(function(c){return renderCharacterCard(c);}).join('') + '</div>';
  }
  h += '</div>';
  return h;
}

// ===== GALLERY =====
async function renderGallery() {
  var data = await api('gallery');
  state.gallery = (data && data.images) || state.gallery;
  var h = '<div class="section">';
  h += '<div class="section-header"><h2 class="section-title"><span class="copper">Gallery</span></h2><span class="section-meta">' + state.gallery.length + ' images</span></div>';
  var cats = []; var seen = {};
  state.gallery.forEach(function(i){ if(!seen[i.category]){seen[i.category]=1;cats.push(i.category);} });
  cats.sort();
  h += '<div class="gallery-filters" id="gallery-filters">';
  h += '<button class="filter-chip active" data-cat="all" onclick="setGalleryFilter(\'all\')">All</button>';
  cats.forEach(function(cat){ h += '<button class="filter-chip" data-cat="'+cat+'" onclick="setGalleryFilter(\''+cat+'\')">'+cat+'</button>'; });
  h += '</div>';
  h += '<div class="gallery-grid" id="gallery-grid">' + renderGalleryItems(state.gallery) + '</div>';
  h += '</div>';
  return h;
}

function renderGalleryItems(images) {
  if (!images || !images.length) return '<div class="empty-state"><div class="empty-icon">\u{1F5BC}\uFE0F</div><p>No images found</p></div>';
  return images.map(function(img) {
    return '<div class="gallery-item" onclick="openImage(\''+(img.source_url||'')+'\',\''+escapeQuotes(img.title||img.filename)+'\')">' +
      '<img src="'+img.source_url+'" alt="'+(img.title||img.filename)+'" loading="lazy">' +
      '<div class="gallery-overlay"><div class="gallery-title">'+(img.title||img.filename)+'</div><div class="gallery-cat">'+(img.category||'')+'</div></div></div>';
  }).join('');
}

function setGalleryFilter(cat) {
  state.galleryFilter = cat;
  document.querySelectorAll('.filter-chip').forEach(function(c){c.classList.toggle('active',c.dataset.cat===cat);});
  var grid = document.getElementById('gallery-grid'); if(!grid) return;
  var f = cat==='all' ? state.gallery : state.gallery.filter(function(i){return i.category===cat;});
  grid.innerHTML = renderGalleryItems(f);
}
function initGalleryFilters() {}

// ===== RADIO =====
async function renderRadio() {
  var data = await api('radio');
  state.radio = (data && data.episodes) || [];
  var h = '<div class="section">';
  h += '<div class="section-header"><h2 class="section-title"><span class="copper">Radio</span></h2><span class="section-meta">'+state.radio.length+' episodes</span></div>';
  if (!state.radio.length) { h += '<div class="empty-state"><p>No episodes yet.</p></div>'; }
  else {
    h += '<div class="radio-list">';
    state.radio.forEach(function(ep) {
      var t=ep.title||ep.piece_title||'Untitled', d=ep.description||ep.piece_description||'';
      h += '<div class="radio-episode"><button class="radio-play-btn" onclick="playRadioEpisode(\''+escapeQuotes(t)+'\',\''+escapeQuotes(d)+'\',\'\')">\u25B6</button><div class="radio-info"><div class="radio-title">'+t+'</div><div class="radio-desc">'+d+'</div></div></div>';
    });
    h += '</div>';
  }
  h += '</div>'; return h;
}

// ===== READ =====
async function renderRead() {
  var data = await api('pieces?sort='+state.readSort+'&limit=60'+(state.readCategory!=='all'?'&category='+state.readCategory:'')+(state.readSearch?'&q='+encodeURIComponent(state.readSearch):''));
  state.pieces = (data&&data.pieces)||[];
  state.totalPieces = (data&&data.total)||0; updatePieceCount();
  var catData = await api('categories');
  var categories = (catData&&catData.categories)||[];
  var h = '<div class="section">';
  h += '<div class="section-header"><h2 class="section-title"><span class="copper">Read</span></h2><span class="section-meta">'+((data&&data.total)||0)+' pieces</span></div>';
  h += '<div class="read-controls">';
  h += '<input type="text" class="search-input" id="read-search" placeholder="Search..." value="'+escapeQuotes(state.readSearch)+'" onkeyup="debounceSearch(event)">';
  h += '<select class="category-select" id="read-category" onchange="setReadCategory(this.value)"><option value="all" '+(state.readCategory==='all'?'selected':'')+'>All Categories</option>';
  categories.forEach(function(c){h+='<option value="'+c.category+'" '+(state.readCategory===c.category?'selected':'')+'>'+c.category+' ('+c.count+')</option>';});
  h += '</select><select class="sort-select" onchange="setReadSort(this.value)">';
  h += '<option value="popular" '+(state.readSort==='popular'?'selected':'')+'>Most Popular</option>';
  h += '<option value="new" '+(state.readSort==='new'?'selected':'')+'>Newest</option>';
  h += '<option value="old" '+(state.readSort==='old'?'selected':'')+'>Oldest</option>';
  h += '<option value="random" '+(state.readSort==='random'?'selected':'')+'>Random</option>';
  h += '</select></div>';
  if (!state.pieces.length) { h += '<div class="empty-state"><p>No pieces found.</p></div>'; }
  else { h += '<div class="cards-grid">'+state.pieces.map(function(p){return renderPieceCard(p);}).join('')+'</div>'; }
  h += '</div>'; return h;
}
function initReadControls() {}
var searchTimer = null;
function debounceSearch(e) { clearTimeout(searchTimer); searchTimer = setTimeout(function(){state.readSearch=e.target.value;navigate('read');},400); }
function setReadSort(s){state.readSort=s;navigate('read');}
function setReadCategory(c){state.readCategory=c;navigate('read');}

// ===== RENDER HELPERS =====
function renderPieceCard(p) {
  var slot = p.slot ? '<span class="card-slot">'+p.slot+'</span>' : '';
  var words = p.word_count ? p.word_count+' words' : '';
  var cat = p.category || 'uncategorized';
  return '<div class="piece-card" onclick="openPiece(\''+p.piece_id+'\')">'+slot+
    '<h3>'+(p.title||'Untitled')+'</h3>'+
    (p.description?'<p class="card-description">'+p.description+'</p>':'')+
    '<div class="card-footer"><span class="card-category">'+cat+'</span><span>'+words+'</span></div>'+
    '<div class="rate-buttons"><button class="rate-btn" onclick="event.stopPropagation();ratePiece(\''+p.piece_id+'\',1,this)">\u{1F44D} Like</button><button class="rate-btn" onclick="event.stopPropagation();ratePiece(\''+p.piece_id+'\',-1,this)">\u{1F44E} Pass</button></div>'+
    '</div>';
}

function renderCharacterCard(c) {
  return '<div class="character-card"><img class="character-portrait" src="'+getPortraitUrl(c)+'" alt="'+c.name+'" loading="lazy">'+
    '<div class="character-info"><div class="character-name">'+c.name+'</div><div class="character-role">'+(c.role||'')+'</div>'+
    (c.description?'<div class="character-desc">'+c.description+'</div>':'')+'</div></div>';
}

// ===== PIECE VIEWER =====
async function openPiece(pieceId) {
  var piece = await api('pieces?id=' + encodePieceId(pieceId));
  if (!piece) return;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'piece-modal';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  var pieceImg = getImageForPiece(piece);
  var cat = piece.category || 'uncategorized';
  overlay.innerHTML = '<div class="modal-content piece-reader">' +
    '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">\u2715</button>' +
    '<div class="reader-hero"><img src="' + pieceImg + '" alt="' + escapeAttr(piece.title) + '"></div>' +
    '<h1 class="reader-title">' + (piece.title||'Untitled') + '</h1>' +
    '<div class="viewer-meta">' +
      '<span style="color:var(--copper)">' + cat + '</span>' +
      (piece.subcategory ? '<span>'+piece.subcategory+'</span>' : '') +
      (piece.word_count ? '<span>'+piece.word_count+' words</span>' : '') +
      (piece.rating_count ? '<span>'+(piece.raw_likes||0)+' likes \u00b7 '+(piece.raw_dislikes||0)+' passes</span>' : '') +
    '</div>' +
    (piece.description ? '<p class="reader-desc">' + truncate(piece.description, 300) + '</p>' : '') +
    '<div class="reader-illustrations">' +
      '<img src="' + pieceImg + '" alt="Illustration" class="reader-illustration">' +
    '</div>' +
    '<div class="viewer-actions">' +
      '<button class="rate-btn" onclick="ratePiece(\''+pieceId+'\',1,this)">\u{1F44D} Like</button>' +
      '<button class="rate-btn" onclick="ratePiece(\''+pieceId+'\',-1,this)">\u{1F44E} Pass</button>' +
      '<button class="reader-listen-btn" onclick="playPieceAudio(\''+pieceId+'\',\''+escapeAttr(piece.title)+'\',\''+pieceImg+'\')">\u{1F3A7} Listen</button>' +
      (piece.source_url ? '<a href="'+piece.source_url+'" target="_blank" class="btn primary">Read Full Piece \u2192</a>' : '') +
    '</div>' +
  '</div>';
  document.body.appendChild(overlay);
}

// ===== CHARACTER MODAL =====
function openCharacter(charId) {
  var c = state.characters.find(function(x) { return (x.character_id || x.name) === charId; });
  if (!c) return;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="modal-content character-modal">' +
    '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">\u2715</button>' +
    '<div class="char-modal-portrait"><img src="' + getPortraitUrl(c) + '" alt="' + escapeAttr(c.name) + '"></div>' +
    '<h2 class="char-modal-name">' + c.name + '</h2>' +
    '<div class="char-modal-role">' + (c.role||'') + '</div>' +
    '<p class="char-modal-desc">' + (c.description||'') + '</p>' +
    '<p class="char-modal-personality">' + (c.personality||'') + '</p>' +
  '</div>';
  document.body.appendChild(overlay);
}

// ===== RATING =====
async function ratePiece(pieceId, rating, btn) {
  var result = await apiPost('pieces?action=rate&id=' + encodePieceId(pieceId), { rating: rating });
  if (!result || result.error) { console.error('Rate failed'); return; }
  var card = btn.closest('.piece-card, .modal-content') || btn.parentElement;
  var buttons = card.querySelectorAll('.rate-btn');
  buttons.forEach(function(b) {
    b.classList.remove('liked','disliked');
    if (b === btn) b.classList.add(rating === 1 ? 'liked' : 'disliked');
  });
  var fb = document.createElement('span');
  fb.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--copper);color:var(--bg);padding:0.5rem 1.5rem;border-radius:4px;font-size:0.85rem;z-index:500;';
  fb.textContent = rating === 1 ? '\u2713 Liked' : '\u2713 Passed';
  document.body.appendChild(fb);
  setTimeout(function() { fb.remove(); }, 1500);
}

// ===== AUDIO SYSTEM =====
function playPieceAudio(pieceId, title, art) {
  state.playlist = [{ id: pieceId, title: title, art: art }];
  state.playlistIndex = 0;
  showPlayer(title, 'Piece from the archive', art);
}

function playRadioEpisode(title, desc, art) {
  state.playlist = [{ id: null, title: title, art: art }];
  state.playlistIndex = 0;
  showPlayer(title, truncate(desc, 60), art);
}

async function shufflePlay() {
  var data = await api('shuffle?category=all');
  if (!data || !data.piece) return;
  var piece = data.piece;
  var img = getImageForPiece(piece);
  state.playlist = [{ id: piece.piece_id, title: piece.title, art: img }];
  state.playlistIndex = 0;
  showPlayer(piece.title || 'Untitled', (piece.category || 'radio') + ' \u00b7 shuffled', img);
  openPiece(piece.piece_id);
}

function showPlayer(title, meta, art) {
  state.audioCurrentTitle = title;
  state.audioCurrentMeta = meta;
  state.audioCurrentArt = art || '';
  var player = document.getElementById('audio-player');
  player.style.display = 'block';
  player.classList.remove('minimized');
  document.getElementById('player-title').textContent = title;
  document.getElementById('player-meta').textContent = meta;

  // Album art
  var artEl = document.getElementById('player-art');
  var placeholder = document.getElementById('player-art-placeholder');
  if (art) {
    artEl.src = art;
    artEl.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    artEl.style.display = 'none';
    placeholder.style.display = 'block';
  }

  // Simulated progress
  state.audioProgress = 0;
  state.audioDuration = 180;
  if (state.audioElement) clearInterval(state.audioElement);
  state.audioElement = setInterval(function() {
    state.audioProgress += 0.5;
    if (state.audioProgress >= state.audioDuration) {
      nextTrack();
      return;
    }
    var bar = document.getElementById('player-progress-bar');
    if (bar) bar.style.width = (state.audioProgress / state.audioDuration * 100) + '%';
    var curEl = document.getElementById('player-time-current');
    var totEl = document.getElementById('player-time-total');
    if (curEl) curEl.textContent = formatTime(state.audioProgress);
    if (totEl) totEl.textContent = formatTime(state.audioDuration);
  }, 500);
  state.audioPlaying = true;
  document.getElementById('player-play').textContent = '\u23F8';
}

function togglePlay() {
  var btn = document.getElementById('player-play');
  if (state.audioPlaying) {
    if (state.audioElement) clearInterval(state.audioElement);
    state.audioPlaying = false;
    btn.textContent = '\u25B6';
  } else {
    if (state.audioElement) {
      state.audioElement = setInterval(function() {
        state.audioProgress += 0.5;
        if (state.audioProgress >= state.audioDuration) { nextTrack(); return; }
        var bar = document.getElementById('player-progress-bar');
        if (bar) bar.style.width = (state.audioProgress / state.audioDuration * 100) + '%';
        var curEl = document.getElementById('player-time-current');
        if (curEl) curEl.textContent = formatTime(state.audioProgress);
      }, 500);
      state.audioPlaying = true;
      btn.textContent = '\u23F8';
    }
  }
}

function prevTrack() {
  if (state.playlistIndex > 0) {
    state.playlistIndex--;
    var t = state.playlist[state.playlistIndex];
    showPlayer(t.title, state.audioCurrentMeta, t.art);
  }
}

function nextTrack() {
  if (state.playlistIndex < state.playlist.length - 1) {
    state.playlistIndex++;
    var t = state.playlist[state.playlistIndex];
    showPlayer(t.title, state.audioCurrentMeta, t.art);
  } else {
    // Auto-shuffle next
    api('shuffle?category=all').then(function(data) {
      if (data && data.piece) {
        var p = data.piece;
        var img = getImageForPiece(p);
        state.playlist.push({ id: p.piece_id, title: p.title, art: img });
        state.playlistIndex = state.playlist.length - 1;
        showPlayer(p.title, 'auto-shuffle', img);
      }
    });
  }
}

function seekPlayer(e) {
  var bar = e.currentTarget;
  var rect = bar.getBoundingClientRect();
  var pct = (e.clientX - rect.left) / rect.width;
  state.audioProgress = pct * state.audioDuration;
  var barEl = document.getElementById('player-progress-bar');
  if (barEl) barEl.style.width = (pct * 100) + '%';
}

function setVolume(val) {
  // Volume control visual only (no real audio file yet)
}

function minimizePlayer() {
  var player = document.getElementById('audio-player');
  player.classList.toggle('minimized');
}

function closePlayer() {
  var player = document.getElementById('audio-player');
  player.style.display = 'none';
  if (state.audioElement) { clearInterval(state.audioElement); state.audioElement = null; }
  state.audioPlaying = false;
}

// ===== IMAGE VIEWER =====
function openImage(url, title) {
  if (!url) return;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="modal-content" style="text-align:center;padding:1rem;"><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">\u2715</button><img src="'+url+'" alt="'+title+'" style="max-width:100%;border-radius:8px;margin-bottom:1rem;"><h3 style="font-family:var(--serif);color:var(--text-bright);">'+title+'</h3></div>';
  document.body.appendChild(overlay);
}
