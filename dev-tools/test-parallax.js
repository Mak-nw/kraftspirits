const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1440 });

  try {
    await page.goto('http://localhost:5173/kraftspirits/index.html', { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Get frame sizes
    const frameSizes = await page.evaluate(() => {
      const hero = document.querySelector('[data-parallax="top"]');
      const aboutHome = [...document.querySelectorAll('[data-parallax]')].find(el => el.dataset.parallax !== 'top');
      return {
        hero: hero ? { h: hero.getBoundingClientRect().height } : null,
        aboutHome: aboutHome ? { h: aboutHome.getBoundingClientRect().height } : null
      };
    });
    console.log('Frame sizes:', JSON.stringify(frameSizes));
    
    // Collect parallax-y values during scroll
    await page.evaluate(() => {
      window.parallaxValues = [];
      window.timestamps = [];
      const startTime = Date.now();
      const interval = setInterval(() => {
        const hero = document.querySelector('[data-parallax="top"]');
        if (hero) {
          const y = hero.style.getPropertyValue('--parallax-y');
          if (y) {
            window.parallaxValues.push(parseFloat(y));
            window.timestamps.push(Date.now() - startTime);
          }
        }
      }, 8);
      window.collectInterval = interval;
    });
    
    // Scroll down 600px in 100ms (fast scroll)
    const startScroll = Date.now();
    while (Date.now() - startScroll < 100) {
      await page.evaluate(() => window.scrollBy(0, 6));
      await page.waitForTimeout(1);
    }
    
    // Wait for animation to settle (1.5s)
    await page.waitForTimeout(1500);
    
    // Stop collecting
    await page.evaluate(() => clearInterval(window.collectInterval));
    
    // Get collected values
    const { collected, timestamps } = await page.evaluate(() => ({
      collected: window.parallaxValues,
      timestamps: window.timestamps
    }));
    
    // Analyze smoothness
    if (collected.length > 1) {
      let maxDelta = 0;
      let deltas = [];
      for (let i = 1; i < collected.length; i++) {
        const d = Math.abs(collected[i] - collected[i-1]);
        deltas.push(d);
        maxDelta = Math.max(maxDelta, d);
      }
      const totalDelta = Math.abs(collected[collected.length-1] - collected[0]);
      const avgDelta = deltas.length > 0 ? deltas.reduce((a,b)=>a+b)/deltas.length : 0;
      
      console.log(`\nParallax test results:`);
      console.log(`Frames collected: ${collected.length}`);
      console.log(`Range: ${Math.min(...collected).toFixed(2)} to ${Math.max(...collected).toFixed(2)}px`);
      console.log(`Total delta: ${totalDelta.toFixed(2)}px`);
      console.log(`Max frame delta: ${maxDelta.toFixed(4)}px`);
      console.log(`Avg frame delta: ${avgDelta.toFixed(4)}px`);
      if (totalDelta > 0) {
        console.log(`Smoothness (max/avg): ${(maxDelta/avgDelta).toFixed(3)}`);
      }
      // Calculate catchup frames (consecutive small deltas after peak)
      let catchupFrames = 0;
      let inCatchup = false;
      for (let i = deltas.length - 1; i >= 0; i--) {
        if (deltas[i] < 0.5 * maxDelta) {
          catchupFrames++;
          inCatchup = true;
        } else if (inCatchup) {
          break;
        }
      }
      console.log(`Catchup frames (delta < 50% max): ${catchupFrames}`);
    }
    
  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await browser.close();
  }
})();
