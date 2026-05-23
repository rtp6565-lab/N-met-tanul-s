# Német kifejezések hangosan

Magyar–német kifejezések folyamatos felolvasása – **telefonról, GitHub Pages-en, kevés mobiladattal**.

## Telefon / GitHub (ajánlott)

1. Töltsd fel a repót GitHubra (lásd **`GITHUB.md`**).
2. Kapcsold be a **GitHub Pages**-t.
3. Nyisd meg a linket telefonon: `https://<neved>.github.io/<repo>/`

| | |
|---|---|
| Első betöltés | ~150–200 KB |
| Tanulás közben | **0 KB** internet (telefon beszél) |
| PHP / `index.php` | **Ne** használd adatspóroláshoz – sokat tölt |

## Gépen – HTML (PHP nélkül)

Dupla katt: **`indit_html.bat`** → `index.html` / `lecke.html`

## Gépen – régi ablakos program

**`indit.bat`** (Python + `felolvaso.py`)

## Funkciók

- 106 kifejezés, kevert sorrend
- Időzítés, ismétlés, szünetek
- Böngésző hang (Web Speech API) – offline barát gyorsítótárral

## Kifejezések szerkesztése

`kifejezesek.json` → generáld újra `phrases.js`-t (lásd `GITHUB.md`) → push GitHubra.

```json
{"magyar": "Jó napot", "nemet": "Guten Tag"}
```
