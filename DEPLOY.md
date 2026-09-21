# Deploy

Target: `https://briankingery87.github.io/agol-credit-planner/`

Same pattern as ask-the-atlas. Static files served from the root of `main`, `.nojekyll`
present so Pages does not run Jekyll over the folder.

---

## A. First push, run in this order

**1. Create the repo on GitHub.** Name it exactly `agol-credit-planner`. Public. Do **not**
initialize with a README, .gitignore or license, since this folder already has them and an
initialized repo forces a merge on the first push.

**2. Assets are already staged.** `assets/author.jpg` is your headshot cropped square to 400x400,
and `assets/tg-geospatial-graylime.png` is the Timmons Group Geospatial Solutions logo, used both
on screen and in print. Nothing to do.

**3. Author block is already set.** Nothing to do here unless something changes later. It lives
near the top of the `<script>` in `index.html`:

```js
const AUTHOR = {
  linkedin: "https://www.linkedin.com/in/briankingery87/",
  photo:    "assets/author.jpg"
};
```

**4. Verify locally.** Open `index.html` in a browser. It was tested headless at 390, 768 and
1400 px with no console errors, but confirm on your machine: photo and logo render, the KPI strip
fills in, both charts draw on first paint, and hovering either chart updates the readout under it.

**5. Initialize and push.**

```bash
cd path\to\agol-credit-planner

git init
git branch -M main
git add .
git commit -m "AGOL Credit Planner: initial release"
git remote add origin https://github.com/briankingery87/agol-credit-planner.git
git push -u origin main
```

**6. Turn on Pages.** Repo → Settings → Pages → Source: **Deploy from a branch** → Branch:
`main`, folder `/ (root)` → Save. First build takes one to two minutes.

**7. Confirm.** Load `https://briankingery87.github.io/agol-credit-planner/`. Hard refresh
(Ctrl+Shift+R) if you get a stale 404 from the Pages CDN.

**8. Set the repo description and topics** so the link previews cleanly:
description `Model ArcGIS Online credit consumption against your real credit supply`,
topics `arcgis` `arcgis-online` `gis` `esri` `credits` `calculator`.
Add the Pages URL to the repo's About panel.

---

## B. Every update after that

```bash
git add -A
git commit -m "<what changed>"
git push
```

Pages redeploys in under a minute. Or run `publish.bat`, which does all three with a
message you pass in:

```
publish.bat "Add wetlands preset and raise default sync multiplier"
```

---

## C. Suggested commit sequence

If you want the history to read as deliberate work rather than one dump, stage it in four
commits instead of one. Do this before step 5's single commit, not after.

```bash
git init
git branch -M main

git add LICENSE README.md .nojekyll
git commit -m "Scaffold: license, readme, Pages config"

git add index.html
git commit -m "Credit planner: sizing model, rates, supply and burn charts"

git add assets/
git commit -m "Author block assets"

git add DEPLOY.md publish.bat
git commit -m "Deployment run order and publish script"

git remote add origin https://github.com/briankingery87/agol-credit-planner.git
git push -u origin main
```

---

## D. Checks before you share the link

- Loads over https with no console errors (F12 → Console).
- Charts draw on first paint, not just after an input change.
- Column header tooltips appear on hover and on keyboard focus (Tab through the header row).
- Export scenario downloads a JSON file; import reads it back.
- Print preview drops the buttons and keeps the charts and tables. Check that no table or chart
  runs past the right margin, that both burn charts land on the same sheet, and that layer names
  in the hosted-content table are not clipped.
- Mobile width: the input panels stack and the content table scrolls sideways rather than
  crushing.
- Reset to defaults restores a clean scenario after you have been editing.
