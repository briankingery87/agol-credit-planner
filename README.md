# ArcGIS Online Credit Planner

A single-page planning tool for modeling ArcGIS Online credit consumption: hosted feature
layers, imagery and file storage, and transaction-based tools, measured against the credits
an organization actually has.

**Live:** https://briankingery87.github.io/agol-credit-planner/

No build step, no dependencies, no network calls. One HTML file that runs entirely in the
browser. Scenarios are kept in `localStorage` and can be exported to JSON.

## What it does

- Sizes hosted feature layers from feature count, vertices per feature and attribute field
  count, using an open model whose assumptions are stated on the page.
- Bills imagery, tile caches, documents, packages and attachments as file or imagery storage
  by GB, which is how ArcGIS Online actually charges them.
- Separates recurring monthly transactions from one-time setup transactions, so a bulk
  geocode at project start does not inflate the steady-state number.
- Builds the credit supply from the organization's user type mix, or takes a real balance
  entered directly.
- Runs cumulative spend against available credits per subscription year, resetting at each
  anniversary because unused subscription credits expire at the end of the term.
- Compares a Standard feature data store against Premium at the M2, M3 and M4 levels, prefilled
  with Esri list pricing and capacity, and gives the break-even for each: the feature-storage
  volume at which the fixed subscription costs the same as pay-as-you-go credits.
- Round-trips real measurements. An ArcGIS Pro snippet prints one line per feature class; pasting
  those lines back into the page creates rows with your measured feature, vertex and field counts.
- Uses the same series colors as the ArcGIS Online organization status dashboard, so the planner's
  charts and your real usage charts read as one set.

## A note on Premium pricing

The Premium feature data store levels in section 04 are prefilled with Esri list pricing read
from the [product buy page](https://www.esri.com/en-us/arcgis/products/premium-feature-data-store/buy)
in September 2026: M2 $2,800/mo with 2 TB, M3 $4,950/mo with 3 TB, M4 $9,500/mo with 4 TB. That
is list price, not your price. The fields are editable so you can drop in what your agreement
or quote actually says, and every figure recalculates as you type. Prices change; check the
buy page before a number leaves the tool.

## Rates

All credit rates come from Esri's
[Understand credits](https://doc.arcgis.com/en/arcgis-online/administer/credits.htm) page and
are used unchanged. Rates change; check the source before committing a number to a budget.

The **sizing model is not from Esri.** Esri publishes credits per megabyte, not megabytes per
feature. The defaults here are engineering estimates, and section 02 states them on the page
rather than burying them. Section 02 also carries the ArcGIS Pro script that measures your own
geometry and loads the result straight into the table, which is what turns the output from a
guess into an estimate.

## Files

```
index.html     the whole application
.nojekyll      tells GitHub Pages to serve the files as-is
assets/        author.jpg, tg-geospatial-graylime.png
LICENSE        MIT
DEPLOY.md      first push and update run order
publish.bat    one-command commit and push
```

## Local development

Open `index.html` in a browser. That is the whole loop. `localStorage` works from `file://`
in Chrome and Edge; if you want it identical to production, serve it:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Customization

The author block and photo path are set in the `AUTHOR` constant at the top of the `<script>`
in `index.html`. Preset layers live in the `PRESETS` object; default scenario values live in
`DEFAULTS`. Credit rates live in `RATE`. The sizing assumptions, which are no longer editable
from the page, live in `DEFAULTS.model` and are disclosed in the section 02 callout: keep the
two in sync if you change them.

## License

MIT. Estimates only. Verify against your own organization status dashboard and your Esri
agreement before using any figure commercially.
