# 🎬 CineStack — Movie Watchlist App

A sleek, modern movie watchlist web application built with vanilla HTML, CSS, and JavaScript. Search movies, filter by type and decade, sort results, and curate your personal watchlist — all powered by the **OMDb API**.

## 🔗 Live Demo

🌐 [View Live App](https://movie-watchlist-app-ayana.vercel.app/)

---

## 🌟 Features

### Core Features
- **🔍 Live Search** — Search movies from the OMDb API with debounced input
- **🎬 Type Filter** — Filter by Movies, Series, or Episodes
- **📅 Decade Filter** — Filter results by decade (2020s, 2010s, 2000s, etc.)
- **🔤 Sorting** — Sort by newest/oldest year or alphabetically (A→Z / Z→A)
- **💾 Watchlist** — Add/remove movies with persistent storage via localStorage
- **🌙 Dark/Light Mode** — Theme toggle with preference saved to localStorage
- **🎲 Random Movie Night** — Pick a random movie from your watchlist

### Bonus Features
- **⏱ Debouncing** — Search input uses debounce to avoid excessive API calls
- **📄 Pagination** — Navigate through multiple pages of search results
- **🎥 Movie Detail Modal** — Click any card to see full details (director, cast, plot, ratings, awards)
- **🔔 Toast Notifications** — Visual feedback for add/remove actions
- **📱 Fully Responsive** — Works on mobile, tablet, and desktop
- **⚡ Loading States** — Animated spinner during API calls
- **🚨 Error Handling** — Graceful error messages for network failures and empty results

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Semantic page structure |
| CSS3 | Custom styling with CSS variables, animations |
| JavaScript (ES6+) | API integration, DOM manipulation, event handling |
| OMDb API | Movie data source |
| localStorage | Watchlist and theme persistence |

---

## 📦 API Used

**OMDb API** — [https://www.omdbapi.com/](https://www.omdbapi.com/)

- Search movies: `GET /?s={query}&page={page}&type={type}&apikey={key}`
- Movie details: `GET /?i={imdbID}&plot=full&apikey={key}`

---

## 🧠 Array Higher-Order Functions Used

| HOF | Where It's Used |
|-----|----------------|
| `.map()` | Rendering movie cards and watchlist items |
| `.filter()` | Decade filtering, removing from watchlist |
| `.sort()` | Sorting by year (newest/oldest) and title (A-Z/Z-A) |
| `.find()` | Locating a movie by IMDb ID |
| `.some()` | Checking if a movie is already in the watchlist |
| `.reduce()` | Counting unique years in watchlist |

---

## 🚀 How to Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/ayanasharma0864/movie-watchlist-app.git
   cd movie-watchlist-app
   ```

2. Open `index.html` in any modern browser, or use a local server:
   ```bash
   npx serve .
   ```

3. Start searching for movies!

---

## 📁 Project Structure

```
movie-watchlist-app/
├── index.html      # Main HTML page
├── style.css       # All styles (dark/light theme, responsive)
├── script.js       # Application logic (API, HOFs, DOM)
└── README.md       # Project documentation
```

---

## 👩‍💻 Made by

**Ayana Sharma**
