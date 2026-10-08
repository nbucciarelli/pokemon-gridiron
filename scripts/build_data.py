#!/usr/bin/env python3
"""Rebuild data/pokedex.json and img/art/*.webp from PokéAPI.

Usage:
    python3 scripts/build_data.py [--max 1025] [--size 192] [--cache .cache/art]

Needs Python 3.9+ and `cwebp` (brew install webp). Downloaded PNGs are cached
so later runs only fetch what's missing.
"""
import argparse
import json
import shutil
import subprocess
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRAPHQL = "https://beta.pokeapi.co/graphql/v1beta"
ARTWORK = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{n}.png"
ENGLISH = 9

QUERY = """
query ($max: Int!) {
  pokemon_v2_pokemon(where: {id: {_lte: $max}}, order_by: {id: asc}) {
    id height weight
    pokemon_v2_pokemontypes { slot pokemon_v2_type { name } }
    pokemon_v2_pokemonstats { base_stat pokemon_v2_stat { name } }
    pokemon_v2_pokemonspecy {
      generation_id
      pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: %d}}) { name }
    }
  }
}
""" % ENGLISH


def fetch_dex(max_id):
    body = json.dumps({"query": QUERY, "variables": {"max": max_id}}).encode()
    req = urllib.request.Request(GRAPHQL, data=body, headers={"Content-Type": "application/json", "User-Agent": "pokemon-gridiron"})
    with urllib.request.urlopen(req, timeout=120) as res:
        rows = json.load(res)["data"]["pokemon_v2_pokemon"]
    dex = []
    for n, row in enumerate(rows, start=1):
        if row["id"] != n:
            sys.exit(f"Expected Pokédex #{n}, got #{row['id']}")
        stats = {s["pokemon_v2_stat"]["name"]: s["base_stat"] for s in row["pokemon_v2_pokemonstats"]}
        types = [t["pokemon_v2_type"]["name"] for t in sorted(row["pokemon_v2_pokemontypes"], key=lambda t: t["slot"])]
        species = row["pokemon_v2_pokemonspecy"]
        dex.append({
            "name": species["pokemon_v2_pokemonspeciesnames"][0]["name"],
            "g": species["generation_id"],
            "types": types,
            "hp": stats["hp"], "atk": stats["attack"], "def": stats["defense"], "spd": stats["speed"],
            "h": row["height"], "w": row["weight"],
        })
    return dex


def download(n, cache):
    path = cache / f"{n}.png"
    if path.exists() and path.stat().st_size > 0:
        return path
    req = urllib.request.Request(ARTWORK.format(n=n), headers={"User-Agent": "pokemon-gridiron"})
    with urllib.request.urlopen(req, timeout=60) as res:
        path.write_bytes(res.read())
    return path


def convert(n, src, out, size):
    subprocess.run(["cwebp", "-quiet", "-q", "72", "-alpha_q", "80", "-m", "6", "-resize", str(size), "0", str(src), "-o", str(out / f"{n}.webp")], check=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--max", type=int, default=1025, help="highest National Pokédex number to include")
    ap.add_argument("--size", type=int, default=192, help="artwork width in px")
    ap.add_argument("--cache", type=Path, default=ROOT / ".cache" / "art", help="where downloaded PNGs are kept")
    args = ap.parse_args()

    if not shutil.which("cwebp"):
        sys.exit("cwebp not found. Install it with: brew install webp")

    print("Fetching Pokédex data…")
    dex = fetch_dex(args.max)
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "pokedex.json").write_text(json.dumps(dex, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote data/pokedex.json ({len(dex)} Pokémon)")

    args.cache.mkdir(parents=True, exist_ok=True)
    out = ROOT / "img" / "art"
    out.mkdir(parents=True, exist_ok=True)
    nums = range(1, len(dex) + 1)
    with ThreadPoolExecutor(max_workers=12) as pool:
        srcs = list(pool.map(lambda n: download(n, args.cache), nums))
        list(pool.map(lambda pair: convert(pair[0], pair[1], out, args.size), zip(nums, srcs)))
    print(f"Wrote {len(dex)} images to img/art/ at {args.size}px")


if __name__ == "__main__":
    main()
