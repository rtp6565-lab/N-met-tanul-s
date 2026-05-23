# GitHub Pages – telefonról, kevés internettel

Ez a projekt **webalapú** és **GitHub Pages-en** futtatható. A **PHP / Google TTS verziót ne** tedd fel GitHubra – az minden szóhoz letölt hangot (sok adat).

## Mi megy fel GitHubra? (statikus, olcsó)

| Fájl | Kell? |
|------|--------|
| `index.html` | igen – főoldal |
| `assets/style.css` | igen |
| `assets/lecke.js` | igen |
| `phrases.js` | igen – kifejezések |
| `manifest.webmanifest` | igen – telefon „alkalmazásként” |
| `sw.js` | igen – offline / kevesebb adat |
| `.nojekyll` | igen |
| `kifejezesek.json` | opcionális (szerkesztéshez) |
| `index.php`, `api.php` | **ne** – nem fut Pages-en |

## Adatforgalom (telefon)

| Mikor | Mennyi |
|-------|--------|
| Első megnyitás (Wi‑Fi ajánlott) | ~150–200 KB (HTML + CSS + JS + szavak) |
| Lejátszás közben | **0 KB** – a telefon saját hangja beszél |
| Második megnyitás (gyorsítótár) | szinte semmi |

## Telepítés GitHub Pages-re

1. Hozz létre egy **új repository**-t GitHubon (pl. `nemet-kifejezesek-hangosan`).
2. Töltsd fel a fenti fájlokat (`git push`).
3. GitHub → **Settings** → **Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` (vagy `master`) → folder: **/ (root)**
4. Várj 1–2 percet. A cím:
   `https://<felhasználóneved>.github.io/<repo-nev>/`

5. Telefonon nyisd meg ezt a linket **Chrome**-ban vagy **Safari**-ban.
6. (Opcionális) „Hozzáadás a kezdőképernyőhöz” – appként nyílik.

## Kifejezés módosítás után

1. Szerkeszd a `kifejezesek.json`-t.
2. Generáld újra a `phrases.js`-t (gépen):
   ```
   py -3 -c "import json; d=json.load(open('kifejezesek.json',encoding='utf-8')); open('phrases.js','w',encoding='utf-8').write('const PHRASES='+json.dumps(d,ensure_ascii=False)+';\n')"
   ```
3. `git add` + `git commit` + `git push` – pár perc múlva frissül a telefonon is.

## Hang a telefonon

- **Android:** Beállítások → Nyelv → Szövegfelolvasás → magyar és német hang letöltése.
- **iPhone:** Beállítások → Akadálymentesség → Kimondott tartalom → Hangok.

Ha nincs jó német hang, a böngésző angolosan olvashat – érdemes német hangot letölteni.
