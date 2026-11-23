const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const shots = process.argv.slice(2).length ? process.argv.slice(2) : ['forest','stone','cutout'];
  for (const s of shots) {
    const [w,h] = s==='cutout' ? [1600,2000] : s==='lineup' ? [2600,1150] : s==='panel' ? [1600,2000] : s==='openwide' ? [2560,1440] : s==='opentall' ? [1200,2200] : [2400,1800];
    const p = await b.newPage({viewport:{width:w,height:h}});
    p.on('pageerror', e=>console.log('ERR', s, e.message)); p.on('console', m=>{ if(m.type()==='error') console.log('CONSOLE', s, m.text()); });
    await p.goto(`http://localhost:8790/render.html?shot=${s}&w=${w}&h=${h}`);
    await p.waitForFunction(()=>window.__png, null, {timeout:240000});
    const d = await p.evaluate(()=>window.__png);
    fs.writeFileSync(`jar-${s}.png`, Buffer.from(d.split(',')[1],'base64')); console.log('ok', s);
    await p.close();
  }
  await b.close();
})();
