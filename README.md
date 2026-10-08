# Pokémon Gridiron

Draft a 22-player football team from the Pokédex. Pick a position on the field, then choose any of the 1,025 Pokémon to play it.

**Play it:** https://nbucciarelli.github.io/pokemon-gridiron/

## Features

- Full field: 11 on offense and a 3-4 defense with 11 more
- Generation checkboxes (Gen I through Gen IX), with Gen I on by default
- Fuzzy search by name or Pokédex number (`pkchu` and `pikachoo` both find Pikachu), plus a type filter
- Scouting card with types, height, weight and base HP, Attack, Defense and Speed
- Auto-fill empty positions, clear the roster, and copy the lineup as text to share
- Your lineup, team name and generation picks are saved in your browser

## Run it locally

It's a static site with no build step, but it loads its data with `fetch`, so serve the folder instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Project layout

| Path | What's in it |
| --- | --- |
| `index.html` | Page markup |
| `css/styles.css` | All styles |
| `js/app.js` | All app logic, plain JavaScript |
| `data/pokedex.json` | Name, generation, types, base stats, height and weight for each Pokémon |
| `img/art/<number>.webp` | Official artwork, resized to 192px |
| `scripts/build_data.py` | Rebuilds the data and artwork from PokéAPI |

## Rebuilding the data

`scripts/build_data.py` pulls everything from [PokéAPI](https://pokeapi.co): stats and names from its GraphQL endpoint, and artwork from the PokeAPI sprites repo. It needs Python 3.9+ and `cwebp`:

```bash
brew install webp
python3 scripts/build_data.py
```

Use `--max` to change how many Pokémon are included when new ones are released, and `--size` to change the artwork width. Downloaded PNGs are cached in `.cache/`, which git ignores.

## Deploying

GitHub Pages serves the `main` branch from the repo root. Pushing to `main` publishes the site.

## Credits and legal

Data and artwork come from [PokéAPI](https://pokeapi.co) and the [PokeAPI sprites repo](https://github.com/PokeAPI/sprites).

This is a fan project. It is not affiliated with or endorsed by Nintendo, Game Freak, Creatures or The Pokémon Company. Pokémon names and artwork are trademarks and copyrights of their respective owners. The MIT license in this repo covers the code only.
