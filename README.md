# ArcGIS Online Credit Planner

A single-page planning tool for modeling ArcGIS Online credit consumption: hosted feature
layers, imagery and file storage, and transaction-based tools, measured against the credits
an organization actually has.

**Live:** https://briankingery87.github.io/agol-credit-planner/

No build step, no dependencies, no network calls. One HTML file that runs entirely in the
browser. Scenarios are kept in `localStorage` and can be exported to JSON.

## Who it is for

New ArcGIS Online administrators who have just been handed a credit balance and do not yet know
what drains it, and experienced administrators doing capacity planning for a renewal or a
proposal. The page opens with two labeled paths, one for auditing an organization that already
exists and one for scoping something that does not, and a glossary covering every term it uses.
Sections are marked **input** or **result** so it is obvious what you fill in and what the tool
works out, and the reference material lives in three side panels reachable from the top bar:
**Rates & prices**, **Accuracy** and **Glossary**.

## What it does

- Starts from measurement, not assumption. Drop an ArcGIS Online **item report** CSV into section
  01 and the page reports the real feature and file storage the org is carrying, what it costs per
  month, storage by item type, the largest items, and how much is sitting in the recycle bin or in
  content with zero views. Parsed in the browser, never uploaded, never saved to the browser and
  never written into an exported scenario, plus the member report reader and the header-based routing that decides which
of the three reports was dropped. Tested against a 25,485-item production export.
- Reads the **member report** too, from the same drop zone, and fills in the user type mix that
  determines your annual credit supply. The header decides which report was dropped.
- Prefills the planning table from that same report. Rows built this way carry measured megabytes
  and are marked **measured**, so the sizing model is bypassed for them entirely.
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
- Recommends what to actually buy. Prices staying on Standard and buying credit blocks against
  moving to each Premium level, per subscription year across the horizon, rules out any option
  that cannot hold the data, and names the cheapest one.
- Round-trips real measurements. The Scope data button opens a side panel with an ArcGIS Pro
  snippet that prints one line per feature class; pasting those lines back creates rows with your
  measured feature, vertex and field counts.
- Uses the same series colors as the ArcGIS Online organization status dashboard, so the planner's
  charts and your real usage charts read as one set.

## Where your data goes

Nowhere. The page is one HTML file with no back end, no analytics and no dependencies, and it
makes **no network requests at all** after it loads. A report you drop in is read by the browser's
local file reader, summarized into totals, and held in a JavaScript variable until the tab closes.
It is never written to browser storage and never appears in an exported scenario. The test suite
asserts all three of those.

Your *scenario* does persist, to `localStorage` in that browser on that device only, so you can
close the tab and come back. It is not shared, not synced and not visible to anyone else, and a
private window starts empty. Refreshing does not clear it; **Reset to defaults** does.

One honest caveat: if you use **Prefill from item report**, the rows it creates are part of your
scenario and therefore do persist and do export. They carry item *type* names and sizes only, never
item titles or owner names.

## Published figures are not editable

Credit price and the Premium level prices are published by Esri and are fixed in the page rather
than exposed as inputs. A rate that can drift silently makes every dollar figure downstream
unverifiable. They live in one place in the source: `DEFAULTS.supply.price` and the `TIERS` array.

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

## Tests

Two suites, both driving the real page in headless Chromium and asserting against the actual
functions rather than a reimplementation of them.

`test/harness.js` - 92 assertions on the calculation pipeline: published rate arithmetic, the
sizing formula, growth compounding, subscription-year resets, the Premium break-even, credit-block
rounding, the recommendation engine, the measurement parser, state round-trips, and edge cases
(zero credit price, one-month horizon, partial second year, empty scenario, negative growth).

`test/csv.js` - 77 assertions on the report readers, using synthetic reports in
`test/fixtures.js`: quoted commas, doubled quotes, embedded newlines, CRLF, a UTF-8 BOM, thousands
separators, reordered and differently-cased headers, `(MB)` unit suffixes, recycle-bin and
zero-view waste detection, per-item credit rating, rejection of a credit report uploaded by
mistake (including the three preamble lines a real credit report starts with), the verbatim header
of a real production export, and confirmation that report contents never reach `localStorage` or an
exported scenario.

### Validation against real organizations

The rates were checked against three production ArcGIS Online organizations by predicting credit
consumption from an item report and comparing it to the org-level rows of the monthly credit
report for the same period.

| Organization | Feature data store | Feature predicted | Feature actual | Error |
|---|---|---|---|---|
| A, 52 items | Standard | 62.48 | 61.97 | **+0.8%** |
| B, 115 items | Standard | 25.14 | 21.55 | +16.7% |
| C, 25,485 items | Premium | 33,029 | 195.69 | +16,778% |

A second pass compared predictions against the per-item credit figures both Standard
organizations publish in **Organization > Status > Credits > Items using the most storage
credits**, which can be downloaded as CSV. Across **45 individual layers**, predictions for
layers that did not change during the period landed within **4 to 5%** of actual consumption,
tightly clustered. Every item outside that band was either created after the billing period
closed or is a layer the organization actively edits. About 1.5% of the residual is the
dashboard's 30-day window against a 30.44-day billing month.

**Organization A confirms the published rate.** Excluding items created after the billing period
closes the gap to +0.2%, an implied 2.3804 credits per 10 MB per month against a published 2.4.
File storage matched to 0.0%.

**Organization B is snapshot drift, not model error.** Its item report is three weeks after the
billing period. Joining the dashboard's per-item credit figures against per-item storage shows
static layers landing within 4 to 5% while two actively edited layers land 43% and 52% high. The
model is right; the snapshot is newer than the bill.

**Organization C is on a Premium feature data store**, so feature storage does not consume credits
at all and the comparison is meaningless until Premium is selected in section 02. With it selected
the tool predicts 869 credits a month against an actual 944, within 8%.

The practical rule, which section 01 now states on screen: a modest overprediction is drift
between a snapshot and a billing period. An overprediction of two orders of magnitude on feature
storage alone means the organization is on Premium.

```bash
npm install --no-save playwright
node test/harness.js
node test/csv.js
```

Exits non-zero on any failure. Playwright is a development dependency only; the page itself
still has none.

What the tests cannot do is validate the sizing model, because there is nothing authoritative
to compare it against. Only a real published layer can do that. See the note on the sizing
model above.

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
