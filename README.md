# 🎬 RichyVD — Movie Library

A sleek, interactive movie library web app built with pure HTML, CSS, and JavaScript. Browse popular movies and anime series through an animated carousel, search for any title, watch trailers, rate your favourites, and save them to your personal list.

## Features

- **Animated Carousel** — smooth next/prev transitions with thumbnail navigation and a running progress bar
- **Live Movie Search** — search any movie or series via the header search bar, powered by the OMDB API
- **Real Movie Data** — each carousel item auto-fetches its actual plot, year, age rating, runtime and genre on load
- **Trailer Button** — opens the official YouTube trailer for each title in a new tab
- **Star Rating** — rate any movie 1–5 stars, ratings are saved and persist across sessions
- **Add to Favourites** — bookmark your favourite titles with one click, saved to localStorage
- **Fully Responsive** — works cleanly on mobile and desktop


## Built With

| Technology | Purpose |
|---|---|
| HTML5 | Structure and markup |
| CSS3 | Styling, animations, and responsive layout |
| JavaScript (Vanilla) | Carousel logic, API calls, ratings, favourites |
| [hemoviedb API](https://www.themoviedb.org/) | Fetching real movie data |
| YouTube Search | Trailer redirects |
| localStorage | Persisting ratings and favourites |

---

##  Project Structure

```
movie-library/
├── index.html        # Main HTML structure
├── style.css         # All styles and animations
├── app.js            # Carousel logic + API + features
├── image/            # Movie poster images
│   ├── 1.png
│   ├── 2.png
│   ├── 3.png
│   ├── 4.png
│   ├── 5.png
│   ├── 6.png
│   └── Thumbnail.png
└── README.md
```

---

##  Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/richyfabz/Movie-Library-.git
cd Movie-Library-
```

### 2. Get a free TMDB API key

- Go to [themoviedb.org](https://www.themoviedb.org/settings/api)
- Sign up for the **free tier** (1,000 requests/day)
- Activate the key from your email

### 3. Add your API key

Open `app.js` and replace the key at the top:

```js
const API_KEY = 'your_api_key_here';
```

### 4. Run it

No build tools needed — just open `index.html` in your browser directly, or use a local server:

---

## How to Use

| Action | How |
|---|---|
| Browse movies | Click the **→** / **←** arrows |
| Search a movie | Type in the search bar in the header |
| Watch a trailer | Click the **Trailer** button on any slide |
| Rate a movie | Click the ⭐ stars below the movie info |
| Save a favourite | Click **+ Add to Favourites** |



---

##  Acknowledgements

- Built as a project during training at **[Web3Bridge](https://www.web3bridge.com/)**
- Movie data provided by [TMDB API](https://www.themoviedb.org/)
- Carousel animation inspired by modern streaming UI patterns

---

##  License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Built with ❤️ by <a href="https://github.com/richyfabz">richyfabz</a></p>