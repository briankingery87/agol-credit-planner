const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:1400,height:1400}});
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('file:///tmp/acp/index.html', {waitUntil:'networkidle'});
  await p.waitForTimeout(400);
  const out = await p.evaluate(() => {
    S = freshState(); rows = []; uid = 0;
    localStorage.removeItem('agol-credit-planner');
    const addRow = o => { rows.push(Object.assign(
      {id:++uid,name:'r'+uid,type:'feature',feat:0,vert:1,attr:0,gb:0,sync:false,growth:0,mb:0}, o)); };
    // BK's scenario, from the screenshots
    addRow({name:'Parcels one county',   type:'feature', feat:45000,  vert:24, attr:50});
    addRow({name:'Parcels multi-county', type:'feature', feat:900000, vert:24, attr:28});
    addRow({name:'Imagery 5,000 GB',     type:'imagery', gb:5000});
    addRow({name:'File 50 GB',           type:'file',    gb:50});
    addRow({name:'Imagery 99,150 GB',    type:'imagery', gb:99150});
    S.supply.months = 12; S.supply.price = 0.12;
    buildControls(); drawRows(); calc();
    const s0 = chartData.series[0];
    const avail = availableAnnual();
    const perMo = s0.total;
    const featMo = s0.f;
    const yr = perMo*12, yrNoFeat = (perMo-featMo)*12;
    const blk = c => Math.ceil(Math.max(0,c)/1000);
    return {
      perMo, featMo, fileMo:s0.fl, imMo:s0.im, txMo:s0.t,
      avail, yr, yrNoFeat,
      shortStd: yr-avail, shortPrem: yrNoFeat-avail,
      blocksStd: blk(yr-avail), blocksPrem: blk(yrNoFeat-avail),
      costStd: blk(yr-avail)*1000*0.12,
      costM2: blk(yrNoFeat-avail)*1000*0.12 + 2800*12,
      costM3: blk(yrNoFeat-avail)*1000*0.12 + 4950*12,
      costM4: blk(yrNoFeat-avail)*1000*0.12 + 9500*12,
      table: [...document.querySelectorAll('#advTable tbody tr')].map(r=>
        [...r.children].map(c=>c.innerText.replace(/\n/g,' | ')).join('  ||  ')),
      verdict: document.getElementById('advVerdict').innerText,
      note: document.getElementById('advNote').innerText
    };
  });
  console.log(JSON.stringify({...out, table:undefined, verdict:undefined, note:undefined}, null, 1));
  console.log('\n--- TABLE ---'); out.table.forEach(r=>console.log(r));
  console.log('\n--- NOTE ---\n'+out.note);
  console.log('\n--- VERDICT ---\n'+out.verdict);
  // mobile overflow check
  await p.setViewportSize({width:390,height:900});
  await p.waitForTimeout(300);
  const ov = await p.evaluate(()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth}));
  console.log('\nmobile scrollWidth', ov.sw, 'clientWidth', ov.cw, ov.sw>ov.cw?('OVERFLOW '+(ov.sw-ov.cw)+'px'):'no overflow');
  await b.close();
})();
