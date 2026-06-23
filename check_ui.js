const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173/');
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));
  
  const content = await page.content();
  console.log("HTML length:", content.length);
  if (content.includes('id="root"></div>')) {
     console.log("Root div is empty!");
  }
  
  await browser.close();
})();
