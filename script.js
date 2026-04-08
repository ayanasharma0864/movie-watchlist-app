/* ═══════════════════════════════════════════════════════
   CineStack — Main Application Logic
   Uses: OMDb API, Array HOFs (map, filter, sort, find, some, reduce, forEach)
   Features: Search, Filter (type + decade), Sort, Watchlist, Dark/Light Mode,
             Pagination, Debounced Search, Local Storage, Random Pick, Modal
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ──────────────────────────────────────────
    // 1. CONFIGURATION
    // ──────────────────────────────────────────
    const API_KEY  = 'df761418';
    const BASE_URL = 'https://www.omdbapi.com/';

    // ──────────────────────────────────────────
    // 2. STATE
    // ──────────────────────────────────────────
    let currentMovies   = [];       // raw results from API (current page)
    let watchlist        = JSON.parse(localStorage.getItem('cineStack_watchlist')) || [];
    let currentQuery     = '';       // last search term
    let currentPage      = 1;       // current pagination page
    let totalResults     = 0;       // total results from API
    let currentType      = '';       // type filter value sent to API
    let debounceTimer    = null;     // for debounced live-search

    // ──────────────────────────────────────────
    // 3. DOM SELECTORS
    // ──────────────────────────────────────────
    const searchInput    = document.getElementById('searchInput');
    const searchBtn      = document.getElementById('searchBtn');
    const movieGrid      = document.getElementById('movieGrid');
    const watchlistGrid  = document.getElementById('watchlistGrid');
    const randomBtn      = document.getElementById('randomBtn');
    const themeToggle    = document.getElementById('themeToggle');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorBanner    = document.getElementById('errorBanner');
    const emptyState     = document.getElementById('emptyState');
    const pagination     = document.getElementById('pagination');
    const typeFilter     = document.getElementById('typeFilter');
    const decadeFilter   = document.getElementById('decadeFilter');
    const sortSelect     = document.getElementById('sortSelect');
    const watchlistCount = document.getElementById('watchlistCount');
    const toastElement   = document.getElementById('toast');
    const modalOverlay   = document.getElementById('movieModal');
    const modalBody      = document.getElementById('modalBody');
    const modalClose     = document.getElementById('modalClose');


    // ──────────────────────────────────────────
    // 4. THEME TOGGLE (Dark / Light Mode)
    // ──────────────────────────────────────────

    // Load saved theme preference from localStorage
    const savedTheme = localStorage.getItem('cineStack_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

    themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';

        html.setAttribute('data-theme', next);
        themeToggle.textContent = next === 'dark' ? '🌙' : '☀️';
        localStorage.setItem('cineStack_theme', next);
    });


    // ──────────────────────────────────────────
    // 5. API FETCH (using fetch + Promises)
    // ──────────────────────────────────────────

    /**
     * Fetches movies from OMDb API
     * @param {string} query   – search term
     * @param {number} page    – page number (1-based)
     * @param {string} type    – movie | series | episode | '' (all)
     */
    function fetchMovies(query, page = 1, type = '') {
        if (!query.trim()) return;

        currentQuery = query.trim();
        currentPage  = page;
        currentType  = type;

        // Show loading, hide errors
        showLoading(true);
        hideError();
        if (emptyState) emptyState.style.display = 'none';

        // Build URL with query parameters
        let url = `${BASE_URL}?s=${encodeURIComponent(currentQuery)}&page=${page}&apikey=${API_KEY}`;
        if (type) {
            url += `&type=${type}`;
        }

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                showLoading(false);

                if (data.Response === 'True') {
                    currentMovies = data.Search;
                    totalResults  = parseInt(data.totalResults, 10);
                    applyFiltersAndSort();
                    renderPagination();
                } else {
                    currentMovies = [];
                    totalResults  = 0;
                    pagination.classList.add('hidden');
                    movieGrid.innerHTML = `<p class="placeholder-text">❌ ${data.Error}</p>`;
                }
            })
            .catch(error => {
                showLoading(false);
                showError('📡 Network error — please check your connection and try again.');
                console.error('Fetch error:', error);
            });
    }

    /**
     * Fetches full movie details by IMDb ID (for the modal view)
     */
    function fetchMovieDetails(imdbID) {
        modalBody.innerHTML = `
            <div class="modal-loading">
                <div class="spinner"></div>
                <p>Loading movie details...</p>
            </div>
        `;

        fetch(`${BASE_URL}?i=${imdbID}&plot=full&apikey=${API_KEY}`)
            .then(response => response.json())
            .then(data => {
                if (data.Response === 'True') {
                    renderModalContent(data);
                } else {
                    modalBody.innerHTML = `<p class="placeholder-text">Could not load details.</p>`;
                }
            })
            .catch(() => {
                modalBody.innerHTML = `<p class="placeholder-text">📡 Network error.</p>`;
            });
    }


    // ──────────────────────────────────────────
    // 6. HOF: FILTERING + SORTING
    //    (using .filter(), .sort(), .map())
    // ──────────────────────────────────────────

    function applyFiltersAndSort() {
        const decade = decadeFilter.value;
        const sortBy = sortSelect.value;

        // ── HOF: .filter() — by decade ──
        let filtered = currentMovies.filter(movie => {
            const year = parseInt(movie.Year);
            if (isNaN(year)) return decade === 'all';  // handle "2020–" style years
            if (decade === 'all')   return true;
            if (decade === 'older') return year < 1980;
            const decadeStart = parseInt(decade);
            return year >= decadeStart && year < decadeStart + 10;
        });

        // ── HOF: .sort() — by year or title ──
        if (sortBy === 'newest') {
            filtered = [...filtered].sort((a, b) => parseInt(b.Year) - parseInt(a.Year));
        } else if (sortBy === 'oldest') {
            filtered = [...filtered].sort((a, b) => parseInt(a.Year) - parseInt(b.Year));
        } else if (sortBy === 'az') {
            filtered = [...filtered].sort((a, b) => a.Title.localeCompare(b.Title));
        } else if (sortBy === 'za') {
            filtered = [...filtered].sort((a, b) => b.Title.localeCompare(a.Title));
        }

        renderMovies(filtered);
    }


    // ──────────────────────────────────────────
    // 7. RENDERING — Search Results
    //    (using .map(), .some())
    // ──────────────────────────────────────────

    function renderMovies(movies) {
        if (!movieGrid) return;

        if (!movies || movies.length === 0) {
            movieGrid.innerHTML = '<p class="placeholder-text">No movies match your filters. Try adjusting them!</p>';
            return;
        }

        // ── HOF: .map() — transform data into HTML cards ──
        movieGrid.innerHTML = movies.map(movie => {
            const poster = movie.Poster !== 'N/A'
                ? movie.Poster
                : 'https://placehold.co/300x450/1e293b/94a3b8?text=No+Poster';

            // ── HOF: .some() — check if movie is in watchlist ──
            const isSaved = watchlist.some(m => m.imdbID === movie.imdbID);
            const btnClass = isSaved ? 'add-btn in-watchlist' : 'add-btn';
            const btnText  = isSaved ? '✓ In Watchlist' : '＋ Watchlist';

            const typeLabel = movie.Type ? movie.Type.charAt(0).toUpperCase() + movie.Type.slice(1) : '';

            return `
                <div class="movie-card" data-imdbid="${movie.imdbID}">
                    ${typeLabel ? `<span class="type-badge">${typeLabel}</span>` : ''}
                    <img src="${poster}" alt="${movie.Title}" loading="lazy"
                         onerror="this.src='https://placehold.co/300x450/1e293b/94a3b8?text=No+Poster'">
                    <div class="card-info">
                        <h3>${movie.Title}</h3>
                        <p>${movie.Year}</p>
                    </div>
                    <button class="${btnClass}" data-id="${movie.imdbID}">${btnText}</button>
                </div>
            `;
        }).join('');
    }


    // ──────────────────────────────────────────
    // 8. RENDERING — Watchlist Sidebar
    //    (using .map(), .reduce())
    // ──────────────────────────────────────────

    function renderWatchlist() {
        if (!watchlistGrid) return;

        // Update count badge
        if (watchlistCount) {
            watchlistCount.textContent = watchlist.length;
            watchlistCount.classList.toggle('hidden', watchlist.length === 0);
        }

        // Toggle random button
        if (randomBtn) {
            randomBtn.classList.toggle('hidden', watchlist.length === 0);
        }

        if (watchlist.length === 0) {
            watchlistGrid.innerHTML = `
                <div class="watchlist-empty">
                    <span class="empty-emoji">🍿</span>
                    <p>Your watchlist is empty.</p>
                    <p style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">Search and add movies!</p>
                </div>
            `;
            return;
        }

        // ── HOF: .map() — render each watchlist item ──
        watchlistGrid.innerHTML = watchlist.map(movie => `
            <div class="watchlist-item">
                <div class="item-meta">
                    <span class="item-title" title="${movie.Title}">${movie.Title}</span>
                    <span class="item-year">${movie.Year}</span>
                </div>
                <button class="remove-btn" data-id="${movie.imdbID}" title="Remove from watchlist">✕</button>
            </div>
        `).join('');

        // ── HOF: .reduce() — Count total unique years in watchlist (stat) ──
        const uniqueYears = watchlist.reduce((acc, movie) => {
            const year = movie.Year;
            if (!acc.includes(year)) acc.push(year);
            return acc;
        }, []);
        // (could display this stat if desired)
    }


    // ──────────────────────────────────────────
    // 9. WATCHLIST ACTIONS
    //    (using .find(), .some(), .filter())
    // ──────────────────────────────────────────

    function addToWatchlist(id) {
        // ── HOF: .find() — locate movie in current results ──
        const movie = currentMovies.find(m => m.imdbID === id);
        if (!movie) return;

        // ── HOF: .some() — prevent duplicates ──
        if (watchlist.some(m => m.imdbID === id)) {
            showToast('Already in your watchlist!');
            return;
        }

        watchlist.push(movie);
        saveWatchlist();
        renderWatchlist();
        renderMovies(getFilteredAndSorted()); // re-render to update button states
        showToast(`✓ "${movie.Title}" added to watchlist!`);
    }

    function removeFromWatchlist(id) {
        // ── HOF: .find() — get movie name for toast ──
        const movieToRemove = watchlist.find(m => m.imdbID === id);

        // ── HOF: .filter() — remove from watchlist ──
        watchlist = watchlist.filter(m => m.imdbID !== id);

        saveWatchlist();
        renderWatchlist();
        renderMovies(getFilteredAndSorted()); // re-render to update button states

        if (movieToRemove) {
            showToast(`Removed "${movieToRemove.Title}" from watchlist`);
        }
    }

    /** Helper: get current filtered + sorted list */
    function getFilteredAndSorted() {
        const decade = decadeFilter.value;
        const sortBy = sortSelect.value;

        let result = currentMovies.filter(movie => {
            const year = parseInt(movie.Year);
            if (isNaN(year)) return decade === 'all';
            if (decade === 'all') return true;
            if (decade === 'older') return year < 1980;
            const decStart = parseInt(decade);
            return year >= decStart && year < decStart + 10;
        });

        if (sortBy === 'newest') {
            result = [...result].sort((a, b) => parseInt(b.Year) - parseInt(a.Year));
        } else if (sortBy === 'oldest') {
            result = [...result].sort((a, b) => parseInt(a.Year) - parseInt(b.Year));
        } else if (sortBy === 'az') {
            result = [...result].sort((a, b) => a.Title.localeCompare(b.Title));
        } else if (sortBy === 'za') {
            result = [...result].sort((a, b) => b.Title.localeCompare(a.Title));
        }

        return result;
    }

    /** Persist watchlist to localStorage */
    function saveWatchlist() {
        localStorage.setItem('cineStack_watchlist', JSON.stringify(watchlist));
    }


    // ──────────────────────────────────────────
    // 10. PAGINATION
    // ──────────────────────────────────────────

    function renderPagination() {
        const totalPages = Math.ceil(totalResults / 10); // OMDb returns 10 per page

        if (totalPages <= 1) {
            pagination.classList.add('hidden');
            return;
        }

        pagination.classList.remove('hidden');

        // Calculate visible page range (show max 5 at a time)
        let startPage = Math.max(1, currentPage - 2);
        let endPage   = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        let html = '';

        // Previous button
        html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹ Prev</button>`;

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        // Page info
        html += `<span class="page-info">${currentPage} of ${totalPages}</span>`;

        // Next button
        html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next ›</button>`;

        pagination.innerHTML = html;
    }


    // ──────────────────────────────────────────
    // 11. MOVIE DETAIL MODAL
    // ──────────────────────────────────────────

    function renderModalContent(movie) {
        const poster = movie.Poster !== 'N/A'
            ? movie.Poster
            : 'https://placehold.co/300x450/1e293b/94a3b8?text=No+Poster';

        const isSaved = watchlist.some(m => m.imdbID === movie.imdbID);
        const btnClass = isSaved ? 'modal-add-btn in-watchlist' : 'modal-add-btn';
        const btnText  = isSaved ? '✓ Already in Watchlist' : '＋ Add to Watchlist';

        modalBody.innerHTML = `
            <div class="modal-top">
                <img class="modal-poster" src="${poster}" alt="${movie.Title}"
                     onerror="this.src='https://placehold.co/300x450/1e293b/94a3b8?text=No+Poster'">
                <div class="modal-info">
                    <h2 class="modal-title">${movie.Title}</h2>
                    <div class="modal-meta">
                        ${movie.Year ? `<span class="meta-tag">📅 ${movie.Year}</span>` : ''}
                        ${movie.Rated && movie.Rated !== 'N/A' ? `<span class="meta-tag">${movie.Rated}</span>` : ''}
                        ${movie.Runtime && movie.Runtime !== 'N/A' ? `<span class="meta-tag">⏱ ${movie.Runtime}</span>` : ''}
                        ${movie.Genre && movie.Genre !== 'N/A' ? `<span class="meta-tag">🎭 ${movie.Genre}</span>` : ''}
                    </div>
                    ${movie.imdbRating && movie.imdbRating !== 'N/A' ? `
                        <div class="modal-rating">
                            <span class="rating-star">⭐</span>
                            <span class="rating-value">${movie.imdbRating}</span>
                            <span class="rating-max">/ 10</span>
                            ${movie.imdbVotes && movie.imdbVotes !== 'N/A' ? `<span class="rating-max">(${movie.imdbVotes} votes)</span>` : ''}
                        </div>
                    ` : ''}
                    ${movie.Plot && movie.Plot !== 'N/A' ? `<p class="modal-plot">${movie.Plot}</p>` : ''}
                </div>
            </div>

            <div class="modal-details">
                ${movie.Director && movie.Director !== 'N/A' ? `
                    <div class="detail-item">
                        <div class="detail-label">Director</div>
                        <div class="detail-value">${movie.Director}</div>
                    </div>
                ` : ''}
                ${movie.Actors && movie.Actors !== 'N/A' ? `
                    <div class="detail-item">
                        <div class="detail-label">Cast</div>
                        <div class="detail-value">${movie.Actors}</div>
                    </div>
                ` : ''}
                ${movie.Language && movie.Language !== 'N/A' ? `
                    <div class="detail-item">
                        <div class="detail-label">Language</div>
                        <div class="detail-value">${movie.Language}</div>
                    </div>
                ` : ''}
                ${movie.Country && movie.Country !== 'N/A' ? `
                    <div class="detail-item">
                        <div class="detail-label">Country</div>
                        <div class="detail-value">${movie.Country}</div>
                    </div>
                ` : ''}
                ${movie.Awards && movie.Awards !== 'N/A' ? `
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <div class="detail-label">Awards</div>
                        <div class="detail-value">🏆 ${movie.Awards}</div>
                    </div>
                ` : ''}
                ${movie.BoxOffice && movie.BoxOffice !== 'N/A' ? `
                    <div class="detail-item">
                        <div class="detail-label">Box Office</div>
                        <div class="detail-value">💰 ${movie.BoxOffice}</div>
                    </div>
                ` : ''}
            </div>

            <button class="${btnClass}" data-id="${movie.imdbID}">${btnText}</button>
        `;

        // Store for add-to-watchlist from modal
        modalBody._movieData = movie;
    }

    function openModal(imdbID) {
        modalOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        fetchMovieDetails(imdbID);
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
        document.body.style.overflow = '';
    }


    // ──────────────────────────────────────────
    // 12. DEBOUNCE (Bonus Feature)
    // ──────────────────────────────────────────

    /**
     * Debounce function — limits how frequently a function executes
     * Applied to the search input for live search
     */
    function debounce(fn, delay) {
        return function(...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    const debouncedSearch = debounce((query) => {
        if (query.length >= 3) {
            fetchMovies(query, 1, typeFilter.value);
        }
    }, 500);


    // ──────────────────────────────────────────
    // 13. UI HELPERS
    // ──────────────────────────────────────────

    function showLoading(show) {
        loadingSpinner.classList.toggle('hidden', !show);
        if (show) {
            movieGrid.innerHTML = '';
            pagination.classList.add('hidden');
        }
    }

    function showError(message) {
        errorBanner.textContent = message;
        errorBanner.classList.remove('hidden');
    }

    function hideError() {
        errorBanner.classList.add('hidden');
    }

    function showToast(message) {
        if (!toastElement) return;

        toastElement.textContent = message;
        toastElement.classList.remove('hidden');
        toastElement.classList.add('show');

        setTimeout(() => {
            toastElement.classList.remove('show');
            setTimeout(() => toastElement.classList.add('hidden'), 300);
        }, 3000);
    }


    // ──────────────────────────────────────────
    // 14. EVENT LISTENERS
    // ──────────────────────────────────────────

    // Search button click
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            fetchMovies(query, 1, typeFilter.value);
        }
    });

    // Enter key to search
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                fetchMovies(query, 1, typeFilter.value);
            }
        }
    });

    // Live search with debounce (typing triggers search after 500ms pause)
    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value.trim());
    });

    // Type filter changes — re-fetch from API (type is an API param)
    typeFilter.addEventListener('change', () => {
        if (currentQuery) {
            fetchMovies(currentQuery, 1, typeFilter.value);
        }
    });

    // Decade filter — client-side filter (HOF)
    decadeFilter.addEventListener('change', applyFiltersAndSort);

    // Sort select — client-side sort (HOF)
    sortSelect.addEventListener('change', applyFiltersAndSort);

    // Movie grid — event delegation for card clicks & add buttons
    movieGrid.addEventListener('click', (e) => {
        // Add to watchlist button
        const addBtn = e.target.closest('.add-btn');
        if (addBtn) {
            e.stopPropagation();
            if (!addBtn.classList.contains('in-watchlist')) {
                addToWatchlist(addBtn.dataset.id);
            }
            return;
        }

        // Card click — open modal
        const card = e.target.closest('.movie-card');
        if (card) {
            openModal(card.dataset.imdbid);
        }
    });

    // Watchlist sidebar — event delegation for remove buttons
    watchlistGrid.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-btn');
        if (removeBtn) {
            removeFromWatchlist(removeBtn.dataset.id);
        }
    });

    // Pagination — event delegation
    pagination.addEventListener('click', (e) => {
        const pageBtn = e.target.closest('.page-btn');
        if (pageBtn && !pageBtn.disabled) {
            const page = parseInt(pageBtn.dataset.page);
            fetchMovies(currentQuery, page, currentType);
            // Scroll to top of results
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Random Pick button
    randomBtn.addEventListener('click', () => {
        if (watchlist.length === 0) return;
        const pick = watchlist[Math.floor(Math.random() * watchlist.length)];
        showToast(`🎬 Tonight's pick: "${pick.Title}" (${pick.Year})`);
        // Also open its detail modal
        openModal(pick.imdbID);
    });

    // Modal close
    modalClose.addEventListener('click', closeModal);


    // Click outside modal to close
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Modal — add/remove from watchlist inside modal
    modalBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.modal-add-btn');
        if (btn && !btn.classList.contains('in-watchlist')) {
            const id = btn.dataset.id;
            const movieData = modalBody._movieData;
            if (movieData) {
                // Add to currentMovies temporarily so addToWatchlist can find it
                if (!currentMovies.some(m => m.imdbID === id)) {
                    currentMovies.push(movieData);
                }
                addToWatchlist(id);
                btn.classList.add('in-watchlist');
                btn.textContent = '✓ Already in Watchlist';
            }
        }
    });


    // ──────────────────────────────────────────
    // 15. INITIAL RENDER
    // ──────────────────────────────────────────
    renderWatchlist();

});