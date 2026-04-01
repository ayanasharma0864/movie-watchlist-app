const API_KEY = 'df761418';

const searchBtn     = document.getElementById('searchBtn');
const searchInput   = document.getElementById('searchInput');
const movieGrid     = document.getElementById('movieGrid');
const watchlistGrid = document.getElementById('watchlistGrid');
const sortSelect    = document.getElementById('sortSelect');
const decadeFilter  = document.getElementById('decadeFilter');
const loadingSpinner = document.getElementById('loadingSpinner');

let currentMovies = [];
let watchlist = JSON.parse(localStorage.getItem('cineStack_watchlist')) || [];

// Initial render
renderWatchlist();

// ── Search ──
searchBtn.addEventListener('click', () => {
    const title = searchInput.value.trim();
    if (title) fetchMovies(title);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchBtn.click();
});

function fetchMovies(title) {
    movieGrid.innerHTML = '';
    loadingSpinner.classList.remove('hidden');

    fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(title)}&type=movie&apikey=${API_KEY}`)
        .then(res => res.json())
        .then(data => {
            loadingSpinner.classList.add('hidden');
            if (data.Response === 'True') {
                currentMovies = data.Search;
                applyFiltersAndSort();
            } else {
                movieGrid.innerHTML = `<p class="placeholder-text">❌ ${data.Error}</p>`;
            }
        })
        .catch(() => {
            loadingSpinner.classList.add('hidden');
            movieGrid.innerHTML = `<p class="placeholder-text">📡 Network error. Check your connection!</p>`;
        });
}

// ── HOF: filter by decade, then sort ──
function applyFiltersAndSort() {
    const decade = decadeFilter.value;
    const sort   = sortSelect.value;

    // HOF: .filter()
    let result = currentMovies.filter(movie => {
        const year = parseInt(movie.Year);
        if (decade === 'all')   return true;
        if (decade === 'older') return year < 1980;
        return year >= parseInt(decade) && year < parseInt(decade) + 10;
    });

    // HOF: .sort()
    if (sort === 'newest') {
        result = result.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));
    } else if (sort === 'oldest') {
        result = result.sort((a, b) => parseInt(a.Year) - parseInt(b.Year));
    }

    displayMovies(result);
}

decadeFilter.addEventListener('change', applyFiltersAndSort);
sortSelect.addEventListener('change', applyFiltersAndSort);

// ── HOF: .map() to render cards ──
function displayMovies(movies) {
    if (movies.length === 0) {
        movieGrid.innerHTML = '<p class="placeholder-text">No movies match your filter.</p>';
        return;
    }

    movieGrid.innerHTML = movies.map(movie => {
        const poster = movie.Poster !== 'N/A'
            ? movie.Poster
            : 'https://placehold.co/300x450/1e293b/94a3b8?text=No+Poster';

        return `
            <div class="movie-card">
                <img src="${poster}" alt="${movie.Title}" onerror="this.src='https://placehold.co/300x450/1e293b/94a3b8?text=No+Poster'">
                <div class="card-info">
                    <h3>${movie.Title}</h3>
                    <p>${movie.Year}</p>
                </div>
                <button class="add-btn" data-id="${movie.imdbID}">＋ Add to Watchlist</button>
            </div>
        `;
    }).join('');

    // Attach events after rendering (avoids inline onclick)
    movieGrid.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', () => addToWatchlist(btn.dataset.id));
    });
}

// ── HOF: .find() and .some() ──
function addToWatchlist(id) {
    const movie = currentMovies.find(m => m.imdbID === id);

    if (watchlist.some(m => m.imdbID === id)) {
        alert('Already in your watchlist!');
        return;
    }

    watchlist.push(movie);
    saveAndRender();
}

// ── HOF: .filter() ──
function removeFromWatchlist(id) {
    watchlist = watchlist.filter(m => m.imdbID !== id);
    saveAndRender();
}

function saveAndRender() {
    localStorage.setItem('cineStack_watchlist', JSON.stringify(watchlist));
    renderWatchlist();
}

// ── HOF: .map() to render watchlist ──
function renderWatchlist() {
    if (watchlist.length === 0) {
        watchlistGrid.innerHTML = '<p class="placeholder-text">Nothing saved yet.</p>';
        return;
    }

    watchlistGrid.innerHTML = watchlist.map(movie => `
        <div class="watchlist-item">
            <span>${movie.Title} (${movie.Year})</span>
            <button class="remove-btn" data-id="${movie.imdbID}">✕</button>
        </div>
    `).join('');

    watchlistGrid.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => removeFromWatchlist(btn.dataset.id));
    });
}
