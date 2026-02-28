const TMDB_KEY  = '01858ee74d59641a015ff873f8d9ef60';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p/w500';
const YT_SEARCH = 'https://www.youtube.com/results?search_query=';

// Must matches HTML slide order exactly
const MOVIE_TITLES = [
  'Squid Game',
  'One Piece',
  'Shogun',
  'Demon Slayer',
  'Game of Thrones',
  'Jujutsu Kaisen',
];

// Cache fetched data so we never fetch the same title twice
const tmdbCache = {};

// DOM refs 
const nextDom            = document.getElementById('next');
const prevDom            = document.getElementById('prev');
const carouselDom        = document.querySelector('.carousel');
const SliderDom          = carouselDom.querySelector('.list');
const thumbnailBorderDom = document.querySelector('.carousel .thumbnail');
const thumbnailItemsDom  = thumbnailBorderDom.querySelectorAll('.item');
const timeRunning        = 2000;
let   runTimeOut;

// Carousel 
thumbnailBorderDom.appendChild(thumbnailItemsDom[0]);

nextDom.onclick = () => showSlider('next');
prevDom.onclick = () => showSlider('prev');

function showSlider(type) {
  const sliderItems = SliderDom.querySelectorAll('.item');
  const thumbItems  = thumbnailBorderDom.querySelectorAll('.item');

  if (type === 'next') {
    SliderDom.appendChild(sliderItems[0]);
    thumbnailBorderDom.appendChild(thumbItems[0]);
    carouselDom.classList.add('next');
  } else {
    SliderDom.prepend(sliderItems[sliderItems.length - 1]);
    thumbnailBorderDom.prepend(thumbItems[thumbItems.length - 1]);
    carouselDom.classList.add('prev');
  }

  clearTimeout(runTimeOut);
  runTimeOut = setTimeout(() => {
    carouselDom.classList.remove('next');
    carouselDom.classList.remove('prev');
    // Enrich the new front item after animation settles
    enrichFrontItem();
  }, timeRunning);
}

// TMDB fetch (with cache) 
async function fetchTMDB(title) {
  if (tmdbCache[title]) return tmdbCache[title];

  try {
    // Try TV first
    const tvRes  = await fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=en-US`);
    const tvData = await tvRes.json();

    if (tvData.results?.length > 0) {
      const show      = tvData.results[0];
      const detailRes = await fetch(`${TMDB_BASE}/tv/${show.id}?api_key=${TMDB_KEY}&append_to_response=content_ratings`);
      const detail    = await detailRes.json();
      const usRating  = detail.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating || 'TV-MA';

      const result = {
        title:    detail.name,
        year:     detail.first_air_date?.slice(0, 4) || 'N/A',
        rating:   usRating,
        seasons:  detail.number_of_seasons ? `${detail.number_of_seasons} Season${detail.number_of_seasons > 1 ? 's' : ''}` : 'N/A',
        genre:    detail.genres?.[0]?.name || 'N/A',
        overview: detail.overview || '',
        score:    detail.vote_average?.toFixed(1) || 'N/A',
      };
      tmdbCache[title] = result;
      return result;
    }

    // Fallback: movie
    const movRes  = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=en-US`);
    const movData = await movRes.json();

    if (movData.results?.length > 0) {
      const movie     = movData.results[0];
      const detailRes = await fetch(`${TMDB_BASE}/movie/${movie.id}?api_key=${TMDB_KEY}&append_to_response=release_dates`);
      const detail    = await detailRes.json();
      const cert      = detail.release_dates?.results?.find(r => r.iso_3166_1 === 'US')?.release_dates?.[0]?.certification || 'PG-13';

      const result = {
        title:    detail.title,
        year:     detail.release_date?.slice(0, 4) || 'N/A',
        rating:   cert,
        seasons:  detail.runtime ? `${detail.runtime} min` : 'N/A',
        genre:    detail.genres?.[0]?.name || 'N/A',
        overview: detail.overview || '',
        score:    detail.vote_average?.toFixed(1) || 'N/A',
      };
      tmdbCache[title] = result;
      return result;
    }
  } catch (e) {
    console.warn('TMDB fetch failed for:', title, e);
  }
  return null;
}


async function enrichFrontItem() {
  // The first .item in .list is always the visible one
  const item = SliderDom.querySelector('.item');
  if (!item) return;

  // Guard IMMEDIATELY (before any await) to prevent race conditions
  if (item.dataset.enriched === 'true') return;
  item.dataset.enriched = 'true'; // Set BEFORE the async fetch

  // Find which title this slide is showing
  const h1    = item.querySelector('h1');
  const title = h1?.textContent?.trim();

  const h4      = item.querySelector('h4');
  const details = item.querySelector('.details');
  if (h4) h4.textContent = '';
  if (details) details.innerHTML = '';

  // Find original title from MOVIE_TITLES by matching h1 text loosely
  const matchedTitle = MOVIE_TITLES.find(t =>
    title?.toLowerCase().includes(t.toLowerCase().split(' ')[0])
  ) || title;

  const data = await fetchTMDB(matchedTitle);
  if (!data) return;

  // Update text
  if (h1) h1.textContent = data.title;
  if (h4) h4.textContent = data.overview;

  if (details) {
    details.innerHTML = `
      <p>${data.year}</p>
      <p>${data.rating}</p>
      <p>${data.seasons}</p>
      <p>${data.genre}</p>
    `;
  }

  // Trailer button → YouTube
  const trailerBtn = item.querySelector('.trailer-btn');
  if (trailerBtn) {
    // Clone to remove old listeners
    const newBtn = trailerBtn.cloneNode(true);
    trailerBtn.replaceWith(newBtn);
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(`${YT_SEARCH}${encodeURIComponent(data.title + ' official trailer')}`, '_blank');
    });
  }

  // Inject extras only if not already there
  const buttons = item.querySelector('.buttons');
  if (buttons && !item.querySelector('.extras')) {
    const savedRating = parseInt(localStorage.getItem(`rating-${data.title}`)) || 0;
    const favs        = JSON.parse(localStorage.getItem('favourites') || '[]');
    const isFav       = favs.includes(data.title);

    const extras      = document.createElement('div');
    extras.className  = 'extras';
    extras.innerHTML  = `
      <div class="star-rating" data-title="${data.title}">
        ${[1,2,3,4,5].map(n =>
          `<span class="star ${n <= savedRating ? 'active' : ''}" data-value="${n}">★</span>`
        ).join('')}
      </div>
      <button class="fav-btn ${isFav ? 'fav-active' : ''}" data-title="${data.title}">
        ${isFav ? '✓ Favourited' : '+ Add to Favourites'}
      </button>
      <span class="tmdb-score">⭐ ${data.score} TMDB</span>
    `;
    buttons.after(extras);

    // Star clicks
    extras.querySelectorAll('.star').forEach(star => {
      star.addEventListener('click', () => {
        const val        = parseInt(star.dataset.value);
        const movieTitle = star.closest('.star-rating').dataset.title;
        localStorage.setItem(`rating-${movieTitle}`, val);
        extras.querySelectorAll('.star').forEach(s => {
          s.classList.toggle('active', parseInt(s.dataset.value) <= val);
        });
      });
    });

    // Favourite click
    const favBtn = favBtn2 = extras.querySelector('.fav-btn');
    favBtn.addEventListener('click', () => {
      const movieTitle = favBtn.dataset.title;
      let saved        = JSON.parse(localStorage.getItem('favourites') || '[]');
      if (saved.includes(movieTitle)) {
        saved = saved.filter(f => f !== movieTitle);
        favBtn.textContent = '+ Add to Favourites';
        favBtn.classList.remove('fav-active');
      } else {
        saved.push(movieTitle);
        favBtn.textContent = '✓ Favourited';
        favBtn.classList.add('fav-active');
      }
      localStorage.setItem('favourites', JSON.stringify(saved));
    });
  }
}

// Search bar 
function injectSearchBar() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  const wrapper     = document.createElement('div');
  wrapper.className = 'search-wrapper';
  wrapper.innerHTML = `
    <input type="text" id="searchInput" placeholder="Search any movie or show..." autocomplete="off" />
    <button id="searchBtn">🔍</button>
    <div id="searchResults"></div>
  `;
  nav.after(wrapper);

  const input   = document.getElementById('searchInput');
  const btn     = document.getElementById('searchBtn');
  const results = document.getElementById('searchResults');
  let   debounce;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (q.length < 2) { results.innerHTML = ''; results.style.display = 'none'; return; }
    debounce = setTimeout(() => searchTMDB(q), 350);
  });

  btn.addEventListener('click', () => { const q = input.value.trim(); if (q) searchTMDB(q); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const q = input.value.trim(); if (q) searchTMDB(q); } });
  document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) results.style.display = 'none'; });
}

async function searchTMDB(query) {
  const results = document.getElementById('searchResults');
  results.innerHTML = '<div class="search-loading">Searching...</div>';
  results.style.display = 'block';

  try {
    const res  = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`);
    const data = await res.json();

    const filtered = (data.results || [])
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 6);

    if (filtered.length === 0) {
      results.innerHTML = `<div class="search-no-result">No results for "<strong>${query}</strong>"</div>`;
      return;
    }

    results.innerHTML = filtered.map(item => {
      const title  = item.media_type === 'tv' ? item.name : item.title;
      const year   = (item.first_air_date || item.release_date || '').slice(0, 4);
      const poster = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : 'image/Thumbnail.png';
      const type   = item.media_type === 'tv' ? 'TV Show' : 'Movie';
      const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
      return `
        <div class="search-item" data-title="${title}">
          <img src="${poster}" alt="${title}" onerror="this.src='image/Thumbnail.png'" />
          <div class="search-item-info">
            <span class="search-title">${title}</span>
            <span class="search-year">${year} · ${type} · ⭐ ${rating}</span>
          </div>
        </div>
      `;
    }).join('');

    results.querySelectorAll('.search-item').forEach(el => {
      el.addEventListener('click', () => {
        const title = el.dataset.title;
        window.open(`${YT_SEARCH}${encodeURIComponent(title + ' official trailer')}`, '_blank');
        results.style.display = 'none';
        document.getElementById('searchInput').value = '';
      });
    });

  } catch (e) {
    results.innerHTML = '<div class="search-no-result">Something went wrong. Try again.</div>';
    console.error(e);
  }
}

// Styles 
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
      padding: 0 20px;
    }
    #searchInput {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 20px;
      padding: 7px 16px;
      color: #fff;
      font-size: 13px;
      width: 220px;
      outline: none;
      transition: all 0.3s;
    }
    #searchInput:focus {
      background: rgba(255,255,255,0.13);
      border-color: #ff0040;
      width: 280px;
    }
    #searchBtn {
      background: #ff0040;
      border: none;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      cursor: pointer;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background 0.2s;
      flex-shrink: 0;
    }
    #searchBtn:hover { background: #cc0033; }
    #searchResults {
      display: none;
      position: absolute;
      top: 115%;
      right: 20px;
      width: 340px;
      background: #12121f;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      overflow: hidden;
      z-index: 9999;
      box-shadow: 0 12px 50px rgba(0,0,0,0.7);
    }
    .search-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      cursor: pointer;
      transition: background 0.2s;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .search-item:last-child { border-bottom: none; }
    .search-item:hover { background: rgba(255,0,64,0.12); }
    .search-item img { width: 42px; height: 58px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
    .search-item-info { display: flex; flex-direction: column; gap: 4px; }
    .search-title { color: #fff; font-size: 13px; font-weight: 600; }
    .search-year  { color: #999; font-size: 11px; }
    .search-loading, .search-no-result { padding: 16px; color: #aaa; font-size: 13px; text-align: center; }
    .search-no-result strong { color: #fff; }

    .extras {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .star-rating { display: flex; gap: 4px; }
    .star {
      font-size: 22px;
      color: rgba(255,255,255,0.2);
      cursor: pointer;
      transition: color 0.15s, transform 0.1s;
    }
    .star:hover, .star.active { color: #ffd700; }
    .star:hover { transform: scale(1.2); }
    .fav-btn {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.35);
      color: #fff;
      padding: 7px 14px;
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .fav-btn:hover { background: rgba(255,255,255,0.1); border-color: #fff; }
    .fav-btn.fav-active { background: #ff0040; border-color: #ff0040; }
    .tmdb-score { font-size: 12px; color: #ffd700; font-weight: 600; white-space: nowrap; }

    header { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }

    @media screen and (max-width: 678px) {
      .search-wrapper { padding: 0 10px; width: 100%; order: 3; }
      #searchInput, #searchInput:focus { width: 100%; }
      #searchResults { width: 100%; right: 0; }
    }
  `;
  document.head.appendChild(style);
}

// Init 
injectStyles();
injectSearchBar();
enrichFrontItem(); // Only enrich the first visible slide on load