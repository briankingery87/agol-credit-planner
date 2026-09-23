const {chromium} = require('playwright');
const F = require('./fixtures.js');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text()); });
  await p.goto('file:///tmp/acp/index.html', {waitUntil:'networkidle'});
  await p.waitForTimeout(300);

  const results = await p.evaluate((F) => {
    const R = [];
    const ok = (name,got,want,eps) => {
      const pass = (typeof want==='number'&&typeof got==='number')
        ? Math.abs(got-want) <= (eps===undefined?1e-6:eps)
        : JSON.stringify(got)===JSON.stringify(want);
      R.push({name,pass,got,want});
    };
    const truthy = (name,got) => R.push({name,pass:!!got,got,want:'truthy'});

    /* --- raw CSV reader --- */
    ok('splits simple rows', parseCSV('a,b\n1,2').length, 2);
    ok('keeps quoted comma in one field', parseCSV('a,b\n"x,y",2')[1][0], 'x,y');
    ok('unescapes doubled quotes', parseCSV('a\n"say ""hi"""')[1][0], 'say "hi"');
    ok('handles CRLF', parseCSV('a,b\r\n1,2\r\n').length, 2);
    ok('strips BOM', parseCSV('﻿a,b\n1,2')[0][0], 'a');
    ok('quoted newline stays in field', parseCSV('a\n"two\nlines"')[1][0], 'two\nlines');
    ok('drops trailing blank lines', parseCSV('a,b\n1,2\n\n\n').length, 2);

    /* --- item report parsing --- */
    let res = parseItemReport(F.basic);
    ok('basic: item count', res.items.length, 4);
    ok('basic: no missing columns', res.missing.length, 0);
    ok('basic: feature MB read', res.items[0].featMB, 512);
    ok('basic: file MB read', res.items[2].fileMB, 2048);
    ok('basic: type read', res.items[3].type, 'PDF');
    ok('basic: hosted flag', res.items[0].hosted, true);
    ok('basic: non-hosted flag', res.items[3].hosted, false);

    let sum = summarizeItems(res.items);
    ok('basic: total feature MB', sum.featMB, 768);
    ok('basic: total file MB', sum.fileMB, 2060);
    // 768/10*2.4 = 184.32 ; 2060/1024*1.2 = 2.4140625
    ok('basic: storage credits per month', sum.cred, 768/10*2.4 + 2060/1024*1.2, 1e-9);
    ok('basic: types sorted by size', sum.types[0].type, 'Image Service');
    ok('basic: largest item first', sum.top[0].title, 'Aerials 2024');
    ok('basic: nothing wasted', sum.wasteMB, 0);

    /* --- gnarly quoting --- */
    res = parseItemReport(F.gnarly);
    ok('gnarly: rows parsed', res.items.length, 2);
    ok('gnarly: quoted comma title intact', res.items[0].title, 'Parcels, County of Example');
    ok('gnarly: doubled quote title intact', res.items[1].title, 'He said "hello" layer');
    ok('gnarly: BOM did not corrupt the header', res.missing.length, 0);

    /* --- waste detection --- */
    res = parseItemReport(F.waste);
    sum = summarizeItems(res.items);
    ok('waste: recycle bin excluded from live storage', sum.featMB, 1000);
    ok('waste: bin item counted', sum.binned, 1);
    ok('waste: bin storage measured', sum.binMB, 4000);
    ok('waste: zero-view item counted', sum.unused, 1);
    ok('waste: zero-view storage measured', sum.unusedMB, 3000);
    ok('waste: total recoverable', sum.wasteMB, 7000);
    // 4000 MB of feature in the bin + 3000 MB of file never opened, each at its own rate
    ok('waste credits rated per storage type',
       sum.wasteCred, 4000/10*2.4 + 3000/1024*1.2, 1e-9);
    truthy('waste credits are not flat-rated at the file rate',
       Math.abs(sum.wasteCred - 7000/1024*1.2) > 100);
    ok('a feature item costs far more than a file item of the same size',
       itemCredits({featMB:1024, fileMB:0}) / itemCredits({featMB:0, fileMB:1024}), 204.8, 1e-9);
    ok('waste: live count excludes bin', sum.nLive, 2);

    /* --- header variants --- */
    res = parseItemReport(F.variants);
    ok('variants: parsed despite case and units', res.items.length, 2);
    ok('variants: feature MB from "(MB)" header', res.items[0].featMB, 200);
    ok('variants: title from reordered column', res.items[0].title, 'Parcels');
    ok('variants: type from uppercase header', res.items[0].type, 'Feature Service');
    truthy('variants: reports owner as missing', res.missing.indexOf('owner') === -1);

    /* --- thousands separators --- */
    res = parseItemReport(F.commas);
    ok('commas: quoted thousands parsed', res.items[0].featMB, 10240);
    ok('commas: view count with comma parsed', res.items[0].views, 1200);
    ok('commas: blank lines skipped', res.items.length, 1);

    /* --- rejection paths --- */
    const wrong = parseItemReport(F.wrongFile);
    truthy('credit report is rejected', !!wrong.error);
    truthy('credit report error names the right report', /item report/i.test(wrong.error||''));
    truthy('empty file is rejected', !!parseItemReport(F.empty).error);
    truthy('header-only file is rejected', !!parseItemReport(F.headerOnly).error);
    truthy('a CSV with storage but no title or type is rejected',
      !!parseItemReport('File Storage Size,Feature Storage Size\n1,2').error);

    /* --- the format ArcGIS Online actually exports --- */
    res = parseItemReport(F.realHeader);
    truthy('real export header parses', !res.error);
    ok('real export: every column matched', res.missing, []);
    ok('real export: rows read', res.items.length, 3);
    // AGOL allows leading spaces in titles; trimming them is deliberate, they are display noise
    ok('real export: leading-space title trimmed', res.items[1].title, 'leading space layer');
    ok('real export: True parsed as hosted', res.items[1].hosted, true);
    ok('real export: False parsed as not hosted', res.items[0].hosted, false);
    ok('real export: bracketed category did not shift columns', res.items[0].fileMB, 8.58761, 1e-9);
    ok('real export: small feature size', res.items[1].featMB, 0.0625, 1e-9);
    sum = summarizeItems(res.items);
    ok('real export: Yes in recycle bin excluded', sum.featMB, 0.0625, 1e-9);
    ok('real export: bin storage tracked', sum.binMB, 1024);

    /* --- a real credit report has three preamble lines before its header --- */
    const cr = parseItemReport(F.realCreditReport);
    truthy('real credit report is rejected', !!cr.error);
    truthy('real credit report error points at the item report', /item report/i.test(cr.error||''));

    /* --- one drop zone, three reports, routed by header --- */
    ok('detects an item report', detectReport(F.basic), 'items');
    ok('detects the real item export', detectReport(F.realHeader), 'items');
    ok('detects a credit report behind its preamble', detectReport(F.realCreditReport), 'credits');
    ok('detects a member report', detectReport(F.memberReport), 'members');
    ok('unknown CSV detects as nothing', detectReport('a,b,c\n1,2,3'), null);

    /* --- member report --- */
    const mem = parseMemberReport(F.memberReport);
    truthy('member report parses', !mem.error);
    ok('member count', mem.n, 5);
    ok('Creator mapped', mem.counts.creator, 1);
    ok('Professional mapped', mem.counts.professional, 1);
    ok('Mobile Worker mapped', mem.counts.mobile, 1);
    ok('Viewer maps to the zero-credit bucket', mem.counts.editor, 1);
    ok('unrecognized user type counted, not silently dropped', mem.unknown, 1);
    ok('disabled accounts flagged', mem.disabled, 1);
    // 500 Creator + 500 Professional + 250 Mobile Worker + 0 Viewer + 0 unknown
    ok('included credits from the member mix',
       USER_TYPES.reduce((a,[k,l,cr])=>a+(mem.counts[k]||0)*cr, 0), 1250);
    truthy('a member report is not read as an item report',
       !!parseItemReport(F.memberReport).error);

    /* --- the report must not leak into saved or exported state --- */
    ORG = summarizeItems(parseItemReport(F.basic).items);
    save();
    const stored = localStorage.getItem('agol-credit-planner') || '';
    truthy('report is not written to localStorage', stored.indexOf('Aerials') === -1);
    const exported = JSON.stringify({version:1, s:S, rows:rows});
    truthy('report is not in the exported scenario', exported.indexOf('Aerials') === -1);
    truthy('report is not in S', JSON.stringify(S).indexOf('featMB') === -1);

    return R;
  }, F);

  const fail = results.filter(r => !r.pass);
  fail.forEach(r => console.log('FAIL  ' + r.name + '\n        got  ' + JSON.stringify(r.got) + '\n        want ' + JSON.stringify(r.want)));
  console.log('\n' + (results.length-fail.length) + '/' + results.length + ' passed, ' + fail.length + ' failed');
  if (errs.length) console.log('PAGE ERRORS:', errs);
  await b.close();
  process.exit(fail.length ? 1 : 0);
})();
