const TMDB_KEY     = '01858ee74d59641a015ff873f8d9ef60';
const TMDB_BASE    = 'https://api.themoviedb.org/3';
const TMDB_IMG     = 'https://image.tmdb.org/t/p/w500';
const YT_SEARCH    = 'https://www.youtube.com/results?search_query=';

// Movies in your carousel 
const MOVIE_TITLES = [
  'Squid Game',
  'One Piece',
  'Shogun',
  'Demon Slayer',
  'Game of Thrones',
  'Jujutsu Kaisen',
];

//  DOM refs 
const nextDom            = document.getElementById('next');
const prevDom            = document.getElementById('prev');
const carouselDom        = document.querySelector('.carousel');
const SliderDom          = carouselDom.querySelector('.list');
const thumbnailBorderDom = document.querySelector('.carousel .thumbnail');
let   thumbnailItemsDom  = thumbnailBorderDom.querySelectorAll('.item');

//Carousel logic (unchanged) 
thumbnailBorderDom.appendChild(thumbnailItemsDom[0]);
const timeRunning = 2000;
let runTimeOut;

nextDom.onclick = () => showSlider('next');
prevDom.onclick = () => showSlider('prev');

function showSlider(type) {
  const sliderItems = SliderDom.querySelectorAll('.carousel .list .item');
  const thumbItems  = document.querySelectorAll('.carousel .thumbnail .item');

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
  }, timeRunning);
}

// TMDB helpers 

// Search TMDB for a title, return first TV or movie result
async function fetchTMDB(title) {
  try {
    // Try TV first - more likely to be a show, and we get seasons/genre easier
    const tvRes  = await fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=en-US&page=1`);
    const tvData = await tvRes.json();
    if (tvData.results && tvData.results.length > 0) {
      const show = tvData.results[0];
      // Fetch full details for runtime/genres
      const detailRes  = await fetch(`${TMDB_BASE}/tv/${show.id}?api_key=${TMDB_KEY}&language=en-US`);
      const detail     = await detailRes.json();
      return {
        type:     'tv',
        id:       show.id,
        title:    detail.name,
        year:     detail.first_air_date ? detail.first_air_date.slice(0, 4) : 'N/A',
        rating:   detail.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating || 'TV-MA',
        seasons:  detail.number_of_seasons ? `${detail.number_of_seasons} Season${detail.number_of_seasons > 1 ? 's' : ''}` : 'N/A',
        genre:    detail.genres?.[0]?.name || 'N/A',
        overview: detail.overview,
        poster:   detail.poster_path ? `${TMDB_IMG}${detail.poster_path}` : null,
        score:    detail.vote_average ? detail.vote_average.toFixed(1) : 'N/A',
      };
    }

    // Fallback to movie
    const movRes  = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=en-US&page=1`);
    const movData = await movRes.json();
    if (movData.results && movData.results.length > 0) {
      const movie      = movData.results[0];
      const detailRes  = await fetch(`${TMDB_BASE}/movie/${movie.id}?api_key=${TMDB_KEY}&language=en-US`);
      const detail     = await detailRes.json();
      return {
        type:     'movie',
        id:       movie.id,
        title:    detail.title,
        year:     detail.release_date ? detail.release_date.slice(0, 4) : 'N/A',
        rating:   detail.release_dates?.results?.find(r => r.iso_3166_1 === 'US')?.release_dates?.[0]?.certification || 'PG-13',
        seasons:  detail.runtime ? `${detail.runtime} min` : 'N/A',
        genre:    detail.genres?.[0]?.name || 'N/A',
        overview: detail.overview,
        poster:   detail.poster_path ? `${TMDB_IMG}${detail.poster_path}` : null,
        score:    detail.vote_average ? detail.vote_average.toFixed(1) : 'N/A',
      };
    }
    return null;
  } catch (e) {
    console.error('TMDB fetch error:', e);
    return null;
  }
}

// Enrich carousel with real TMDB data 
async function enrichCarousel() {
  const items = SliderDom.querySelectorAll('.item');

  for (let i = 0; i < items.length; i++) {
    const title = MOVIE_TITLES[i];
    if (!title) continue;
    const data = await fetchTMDB(title);
    if (!data) continue;

    const item    = items[i];
    const h1      = item.querySelector('h1');
    const h4      = item.querySelector('h4');
    const details = item.querySelector('.details');

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
      trailerBtn.onclick = (e) => {
        e.preventDefault();
        window.open(`${YT_SEARCH}${encodeURIComponent(data.title + ' official trailer')}`, '_blank');
      };
    }

    // Inject stars + favourites
    const buttons = item.querySelector('.buttons');
    if (buttons && !buttons.querySelector('.extras')) {
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
      const favBtn = extras.querySelector('.fav-btn');
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

  btn.addEventListener('click', () => {
    const q = input.value.trim();
    if (q) searchTMDB(q);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q) searchTMDB(q);
    }
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) results.style.display = 'none';
  });
}

async function searchTMDB(query) {
  const results = document.getElementById('searchResults');
  results.innerHTML = '<div class="search-loading">Searching...</div>';
  results.style.display = 'block';

  try {
    // TMDB multi-search covers movies, TV shows, and people in one call
    const res  = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`);
    const data = await res.json();

    // Filter to only movies and TV shows
    const filtered = (data.results || [])
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 6);

    if (filtered.length === 0) {
      results.innerHTML = `<div class="search-no-result">No results for "<strong>${query}</strong>"</div>`;
      return;
    }

    results.innerHTML = filtered.map(item => {
      const title   = item.media_type === 'tv' ? item.name : item.title;
      const year    = (item.first_air_date || item.release_date || '').slice(0, 4);
      const poster  = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : 'image/Thumbnail.png';
      const type    = item.media_type === 'tv' ? 'TV Show' : 'Movie';
      const rating  = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
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

    results.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        const title = item.dataset.title;
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
  const style       = document.createElement('style');
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
    .search-item img {
      width: 42px;
      height: 58px;
      object-fit: cover;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .search-item-info { display: flex; flex-direction: column; gap: 4px; }
    .search-title { color: #fff; font-size: 13px; font-weight: 600; }
    .search-year  { color: #999; font-size: 11px; }
    .search-loading, .search-no-result {
      padding: 16px;
      color: #aaa;
      font-size: 13px;
      text-align: center;
    }
    .search-no-result strong { color: #fff; }

    /* Stars & Extras */
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
    .tmdb-score {
      font-size: 12px;
      color: #ffd700;
      font-weight: 600;
      white-space: nowrap;
    }

    /* Header layout */
    header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    @media screen and (max-width: 678px) {
      .search-wrapper { padding: 0 10px; width: 100%; order: 3; }
      #searchInput, #searchInput:focus { width: 100%; }
      #searchResults { width: 100%; right: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ── Init ──────────────────────────────────────────────────────────────────────
injectStyles();
injectSearchBar();
enrichCarousel();