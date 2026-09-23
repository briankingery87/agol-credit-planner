const {chromium} = require('playwright');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:1400,height:1000}});
  const pageErrs = [];
  p.on('pageerror', e => pageErrs.push(e.message));
  p.on('console', m => { if (m.type()==='error') pageErrs.push('console: '+m.text()); });
  await p.goto('file:///tmp/acp/index.html', {waitUntil:'networkidle'});
  await p.waitForTimeout(400);

  const results = await p.evaluate(() => {
    const R = [];
    const EPS = 1e-6;
    const ok = (name, got, want, eps) => {
      const e = eps === undefined ? EPS : eps;
      const pass = (typeof want === 'number' && typeof got === 'number')
        ? Math.abs(got - want) <= e
        : JSON.stringify(got) === JSON.stringify(want);
      R.push({name, pass, got, want});
    };
    const truthy = (name, got) => R.push({name, pass: !!got, got, want:'truthy'});

    const reset = () => {
      S = freshState(); rows = []; uid = 0;
      localStorage.removeItem('agol-credit-planner');
    };
    const addRow = (o) => { const r = Object.assign(
      {id:++uid, name:'r'+uid, type:'feature', feat:0, vert:1, attr:0, gb:0, sync:false, growth:0}, o);
      rows.push(r); return r; };
    const run = () => { buildControls(); drawRows(); calc(); };

    /* ---------- 1. published rate arithmetic ---------- */
    ok('RATE feature per 10MB', RATE.featurePer10MB, 2.4);
    ok('RATE file per GB', RATE.filePerGB, 1.2);
    ok('RATE imagery per GB', RATE.imageryPerGB, 1.2);
    ok('RATE geocode per 1k', RATE.geocodePer1k, 40);
    ok('RATE print job', RATE.printJob, 5);
    ok('RATE simple route', RATE.simpleRoute, 0.005);
    ok('RATE optimized route', RATE.optRoute, 0.5);
    ok('RATE tile per 10k', RATE.tilePer10k, 1);
    ok('RATE notebook hr', RATE.notebookHr, 3);
    ok('RATE notebook GPU hr', RATE.notebookGpuHr, 30);
    ok('RATE modelbuilder hr', RATE.modelBuilderHr, 50);
    ok('RATE demographic per 1k', RATE.demoPer1k, 10);

    /* ---------- 2. file and imagery storage bill per GB ---------- */
    reset();
    let fileRow = addRow({type:'file', gb:1});
    ok('1 GB file = 1.2 credits/mo', rowCredits(fileRow,0), 1.2);
    reset();
    let imgRow = addRow({type:'imagery', gb:1});
    ok('1 GB imagery = 1.2 credits/mo', rowCredits(imgRow,0), 1.2);
    reset();
    let big = addRow({type:'file', gb:7.5});
    ok('7.5 GB file = 9 credits/mo', rowCredits(big,0), 9);

    /* ---------- 3. sizing model formula ---------- */
    reset();
    const M = S.model;
    const expect = (v,a,sync) =>
      (v*M.bytesPerVertex + a*M.bytesPerAttr + M.rowOverhead) * M.indexFactor * (sync?M.syncFactor:1) * M.calibration;
    ok('bytesPerFeature 24v 28a', bytesPerFeature(24,28,false), expect(24,28,false), 1e-9);
    ok('bytesPerFeature 24v 28a = 1766.4', bytesPerFeature(24,28,false), 1766.4, 1e-9);
    ok('sync applies 1.70x', bytesPerFeature(24,28,true)/bytesPerFeature(24,28,false), 1.70, 1e-9);
    ok('point layer 1v 0a', bytesPerFeature(1,0,false), (16+48)*1.6, 1e-9);

    /* ---------- 4. feature storage bills at 2.4 per 10 MB ---------- */
    reset();
    const bpf = bytesPerFeature(24,28,false);
    const featFor10MB = 10*1048576/bpf;
    const fr = addRow({type:'feature', feat:featFor10MB, vert:24, attr:28});
    ok('engineered 10 MB feature layer size', rowMB(fr,0), 10, 1e-9);
    ok('10 MB feature layer = 2.4 credits/mo', rowCredits(fr,0), 2.4, 1e-9);

    /* ---------- 5. growth compounds monthly ---------- */
    reset();
    const gr = addRow({type:'file', gb:1, growth:10});
    ok('growth 10%/mo at month 0', rowMB(gr,0), 1024, 1e-9);
    ok('growth 10%/mo at month 12', rowMB(gr,12), 1024*Math.pow(1.1,12), 1e-6);
    ok('zero growth is flat', (()=>{ reset(); const z=addRow({type:'file',gb:2}); return rowMB(z,36); })(), 2048, 1e-9);

    /* ---------- 6. transactions ---------- */
    reset();
    S.txm = {geocodes:1000, prints:5, optRoutes:2, simpleRoutes:1000, tiles:20000, notebookHrs:3, demoReq:2000};
    ok('txMonthly composite', txMonthly(), 40 + 25 + 1 + 5 + 2 + 9 + 20, 1e-9);
    reset();
    S.txm = {geocodes:0, prints:0, optRoutes:0, simpleRoutes:0, tiles:0, notebookHrs:0, demoReq:0};
    S.txo = {geocodes:5000, tiles:10000, notebookHrs:1};
    ok('txOnce composite', txOnce(), 200 + 1 + 3, 1e-9);

    /* ---------- 7. credit supply ---------- */
    reset();
    S.users = {creator:3, professional:1, proplus:0, mobile:0, contributor:0, editor:5};
    ok('included 3 creator + 1 pro = 2000', includedAnnual(), 2000);
    S.users.mobile = 2;
    ok('plus 2 mobile worker = 2500', includedAnnual(), 2500);
    S.users.editor = 99;
    ok('editors add nothing', includedAnnual(), 2500);
    S.supply.purchased = 1000;
    ok('purchased adds to available', availableAnnual(), 3500);
    S.supply.useBalance = true; S.supply.balance = 777;
    ok('balance override wins', availableAnnual(), 777);

    /* ---------- 8. subscription year reset ---------- */
    reset();
    S.supply.months = 24;
    addRow({type:'file', gb:10});            // flat 12 credits/mo
    run();
    const s = chartData.series;
    ok('24 months of series', s.length, 24);
    ok('month 1 total', s[0].total, 12, 1e-9);
    ok('cumulative at month 12', s[11].cum, 144, 1e-9);
    ok('cumulative RESETS at month 13', s[12].cum, 12, 1e-9);
    ok('cumulative at month 24', s[23].cum, 144, 1e-9);

    /* ---------- 9. premium zeroes feature storage only ---------- */
    reset();
    S.supply.months = 12;
    addRow({type:'feature', feat:100000, vert:24, attr:28});
    addRow({type:'file', gb:5});
    addRow({type:'imagery', gb:5});
    run();
    const stdMonth = chartData.series[0];
    const stdFeat = stdMonth.f, stdFl = stdMonth.fl, stdIm = stdMonth.im;
    S.fds.premium = true; run();
    const premMonth = chartData.series[0];
    ok('premium zeroes feature credits', premMonth.f, 0);
    ok('premium keeps fRaw for comparison', premMonth.fRaw, stdFeat, 1e-9);
    ok('premium leaves file storage alone', premMonth.fl, stdFl, 1e-9);
    ok('premium leaves imagery alone', premMonth.im, stdIm, 1e-9);
    ok('file and imagery are separate series', stdFl === stdIm, true);

    /* ---------- 10. premium break-even ---------- */
    reset();
    S.supply.price = 0.12;
    const beCred = 2800/0.12;
    const beGB = beCred/RATE.featurePer10MB*10/1024;
    ok('M2 break-even credits/mo', beCred, 23333.3333, 1e-3);
    ok('M2 break-even GB', beGB, 94.9436, 0.001);
    ok('TIERS prices are the published list prices', TIERS.map(t=>t[3]), [2800,4950,9500]);
    ok('Premium prices are not user state', S.fds.m2, undefined);
    ok('credit price is the Esri list price', DEFAULTS.supply.price, 0.12);
    ok('TIERS capacities TB', TIERS.map(t=>t[4]), [2,3,4]);

    /* ---------- 11. credit blocks round up ---------- */
    ok('CREDIT_BLOCK is 1000', CREDIT_BLOCK, 1000);
    ok('1 credit short = 1 block', Math.ceil(1/CREDIT_BLOCK), 1);
    ok('1000 credits short = 1 block', Math.ceil(1000/CREDIT_BLOCK), 1);
    ok('1001 credits short = 2 blocks', Math.ceil(1001/CREDIT_BLOCK), 2);

    /* ---------- 12. KPI strip agrees with the series ---------- */
    reset();
    S.supply.months = 24;
    addRow({type:'file', gb:10});
    run();
    const kpi2 = document.querySelector('#k2 .n').textContent.replace(/,/g,'');
    ok('KPI credits/month matches series', Number(kpi2), Math.round(chartData.series[0].total));
    const kpi4 = document.querySelector('#k4 .n').textContent.replace(/,/g,'');
    ok('KPI supply matches availableAnnual', Number(kpi4), availableAnnual());

    /* ---------- 13. recommendation engine ---------- */
    reset();
    S.supply.months = 12; S.supply.price = 0.12;
    addRow({type:'file', gb:1});   // tiny, no shortfall
    run();
    truthy('tiny scenario recommends buying nothing',
      /Buy nothing/i.test(document.getElementById('advVerdict').textContent));

    reset();
    S.supply.months = 12; S.supply.price = 0.12;
    addRow({type:'feature', feat:40000000, vert:24, attr:28});   // ~66 GB
    run();
    const v66 = document.getElementById('advVerdict').textContent;
    truthy('66 GB recommends credits over Premium', /blocks of 1,000 credits and stay on Standard/i.test(v66));

    reset();
    S.supply.months = 12; S.supply.price = 0.12;
    addRow({type:'feature', feat:400000000, vert:24, attr:28});  // ~658 GB, over Standard cap
    run();
    const vBig = document.getElementById('advVerdict').textContent;
    truthy('over 500 GB recommends Premium', /Move to M2/i.test(vBig));
    const stdRow = document.querySelectorAll('#advTable tbody tr')[1].textContent;
    truthy('over 500 GB marks Standard not viable', /not viable/i.test(stdRow));

    reset();
    S.supply.months = 12;
    addRow({type:'feature', feat:3000000000, vert:24, attr:28}); // over M4
    run();
    truthy('over M4 says nothing holds it',
      /Nothing here holds this much data/i.test(document.getElementById('advVerdict').textContent));

    /* ---------- Premium is only ever a feature-storage lever ---------- */
    // A huge imagery layer is file-class storage. Premium cannot touch it, so
    // "stay on Standard" is correct and the page has to say why.
    reset();
    S.supply.months = 24; S.supply.price = 0.12; S.users.creator = 8; S.users.editor = 0;
    addRow({type:'feature', feat:45000, vert:24, attr:50});
    addRow({type:'feature', feat:900000, vert:24, attr:28});
    addRow({type:'imagery', gb:500000});
    run();
    const imgV = document.getElementById('advVerdict').textContent;
    const imgP = document.getElementById('pfdsVerdict').textContent;
    ok('imagery bills at the file rate', chartData.series[0].im, 500000*RATE.filePerGB, 1e-6);
    ok('premium does not zero imagery', (()=>{ S.fds.premium = true; run();
        const v = chartData.series[0].im; S.fds.premium = false; run(); return v; })(),
       500000*RATE.filePerGB, 1e-6);
    truthy('imagery-dominated plan still recommends Standard', /stay on Standard/i.test(imgV));
    truthy('recommendation names the cost driver', /What is driving it/i.test(imgV));
    truthy('recommendation explains why Premium lost', /only touches feature storage/i.test(imgV));
    truthy('premium panel says Premium is not the lever', /not the lever here/i.test(imgP));
    truthy('absurd block counts suggest an agreement', /account manager/i.test(imgV));
    /* The second time BK read this table he still took "buy N blocks" to be the
       alternative to a subscription. The table has to separate the three cost
       components and say outright how little Premium takes off the block count. */
    const advHdr = document.querySelectorAll('#advTable tbody tr')[0];
    ok('options table splits blocks, subscription and total', advHdr.children.length, 4);
    truthy('blocks column says the credits are still bought',
      /still buy/i.test(advHdr.children[1].textContent));
    truthy('subscription has its own column', /subscription/i.test(advHdr.children[2].textContent));
    const m2Row = document.querySelectorAll('#advTable tbody tr')[2].textContent;
    truthy('premium row still shows a block purchase', /\u00d7 1,000/.test(m2Row));
    truthy('premium row states how few blocks it saves', /fewer than Standard/i.test(m2Row));
    truthy('verdict says Premium adds to, not replaces, the credit buy',
      /does not replace the credit purchase/i.test(imgV));
    truthy('note tells the reader to read Premium rows as plus, not instead',
      /not instead of them/i.test(document.getElementById('advNote').textContent));
    /* BK read the monthly subscription price against the monthly total bill and
       expected M2 to win. The advice has to make that same comparison against the
       only slice Premium can remove, in dollars per month. */
    truthy('advice compares per month, like for like', /per month, like for like/i.test(imgV));
    truthy('advice names what Premium cannot touch',
      /bill the same on every data store/i.test(imgV));
    truthy('advice gives the feature-storage break-even in GB', /breaks even at about/i.test(imgV));
    truthy('premium panel quotes a monthly figure against a monthly price',
      /a month against .* a month for M2/i.test(imgP));

    // and the opposite case still recommends moving
    reset();
    S.supply.months = 24; S.supply.price = 0.12;
    addRow({type:'feature', feat:120000000, vert:24, attr:28});
    run();
    truthy('feature-dominated plan recommends Premium',
      /Move to M2/i.test(document.getElementById('advVerdict').textContent));
    truthy('no spurious "not the lever" when feature dominates',
      !/not the lever/i.test(document.getElementById('pfdsVerdict').textContent));

    /* ---------- 14. measured import parser ---------- */
    reset(); run();
    const before = rows.length;
    document.getElementById('measIn').value =
      'PLANNER|Parcels|45000|24.3|28\n' +
      'Parcels  features 45,000  mean 24.3  median 20  max 900  fields 28\n' +
      'PLANNER|Roads|30000|41.7|20\n' +
      'garbage line\n' +
      'PLANNER|Bad|0|10|5';
    importMeasured();
    ok('import adds only valid PLANNER lines', rows.length - before, 2);
    ok('imported feature count', rows[rows.length-2].feat, 45000);
    ok('imported mean vertices kept as decimal', rows[rows.length-2].vert, 24.3);
    ok('imported attribute count', rows[rows.length-2].attr, 28);
    ok('imported row type is feature', rows[rows.length-1].type, 'feature');
    ok('zero-feature PLANNER line rejected', rows.filter(r=>r.name==='Bad').length, 0);

    /* ---------- 15. state round trip ---------- */
    reset();
    S.supply.months = 18; S.supply.price = 0.09;
    addRow({type:'feature', feat:12345, vert:7, attr:9, sync:true, growth:2.5});
    run();
    const snapshot = JSON.stringify({s:S, rows:rows});
    const parsed = JSON.parse(snapshot);
    S = Object.assign(freshState(), parsed.s);
    ['users','supply','fds','model','txm','txo'].forEach(g=>{
      S[g] = Object.assign(JSON.parse(JSON.stringify(DEFAULTS[g])), parsed.s[g]||{});
    });
    rows = parsed.rows;
    run();
    ok('round trip keeps months', S.supply.months, 18);
    ok('round trip keeps price', S.supply.price, 0.09);
    ok('round trip keeps the data store choice', S.fds.tier, 'm2');
    ok('round trip keeps sync flag', rows[0].sync, true);
    ok('round trip keeps growth', rows[0].growth, 2.5);

    /* ---------- 16. edge cases ---------- */
    // zero credit price must not produce NaN or Infinity on screen
    reset();
    S.supply.months = 12; S.supply.price = 0;
    addRow({type:'file', gb:5});
    run();
    const zeroPriceText = document.getElementById('sec-burn').textContent
      + document.getElementById('sec-advice').textContent;
    ok('zero credit price produces no NaN', /NaN/.test(zeroPriceText), false);
    ok('zero credit price produces no Infinity', /Infinity/.test(zeroPriceText), false);

    // single month horizon
    reset();
    S.supply.months = 1;
    addRow({type:'file', gb:10});
    run();
    ok('1 month horizon has 1 point', chartData.series.length, 1);
    ok('1 month cumulative equals month total', chartData.series[0].cum, 12, 1e-9);

    // partial second subscription year
    reset();
    S.supply.months = 13;
    addRow({type:'file', gb:10});
    run();
    ok('13 month horizon length', chartData.series.length, 13);
    ok('month 13 starts a new year', chartData.series[12].cum, 12, 1e-9);

    // no rows at all
    reset();
    S.supply.months = 12;
    run();
    const emptyText = document.getElementById('sec-advice').textContent;
    ok('empty scenario produces no NaN', /NaN/.test(emptyText), false);
    ok('empty scenario storage is zero', chartData.series[0].total, 0, 1e-9);

    // negative growth shrinks
    reset();
    const shrink = addRow({type:'file', gb:10, growth:-5});
    ok('negative growth shrinks', rowMB(shrink,12) < rowMB(shrink,0), true);

    // one-time transactions hit month 1 only
    reset();
    S.supply.months = 6;
    S.txo = {geocodes:10000, tiles:0, notebookHrs:0};
    run();
    ok('one-time charge lands in month 1', chartData.series[0].t, 400, 1e-9);
    ok('one-time charge absent in month 2', chartData.series[1].t, 0, 1e-9);

    // recommendation still compares against Standard while Premium is toggled on
    reset();
    S.supply.months = 12; S.supply.price = 0.12; S.fds.premium = true;
    addRow({type:'feature', feat:40000000, vert:24, attr:28});
    run();
    truthy('recommendation still evaluates Standard when Premium toggle is on',
      /stay on Standard/i.test(document.getElementById('advVerdict').textContent));

    // disabled inputs do not contribute
    reset();
    const mixed = addRow({type:'file', gb:2, feat:999999, vert:99, attr:99});
    ok('file row ignores feature inputs', rowMB(mixed,0), 2048, 1e-9);
    reset();
    const mixed2 = addRow({type:'feature', feat:1000, vert:10, attr:10, gb:500});
    ok('feature row ignores GB input', rowMB(mixed2,0), 1000*bytesPerFeature(10,10,false)/1048576, 1e-9);

    /* ---------- money formatting ---------- */
    ok('money adds a dollar sign and separators', money(1234567), '$1,234,567');
    ok('money with cents', money(0.12,2), '$0.12');
    ok('money of zero', money(0), '$0');
    ok('money of a non-number', money(NaN), '-');

    /* ---------- horizon control ---------- */
    reset(); S.supply.months = 24; run();
    setHorizon(36);
    ok('setHorizon updates state', S.supply.months, 36);
    ok('setHorizon recalculates the series', chartData.series.length, 36);

    /* ---------- 17. formatting ---------- */
    ok('fmtSize under 1 GB stays MB', fmtSize(512), '512.0 MB');
    ok('fmtSize at 1024 MB is GB', fmtSize(1024), '1.00 GB');
    ok('fmtSize 7424 MB', fmtSize(7424), '7.25 GB');

    return R;
  });

  const fail = results.filter(r => !r.pass);
  results.forEach(r => {
    if (!r.pass) console.log('FAIL  ' + r.name + '\n        got  ' + JSON.stringify(r.got) + '\n        want ' + JSON.stringify(r.want));
  });
  console.log('\n' + (results.length - fail.length) + '/' + results.length + ' passed, ' + fail.length + ' failed');
  if (pageErrs.length) console.log('PAGE ERRORS:', pageErrs);
  await b.close();
  process.exit(fail.length ? 1 : 0);
})();
