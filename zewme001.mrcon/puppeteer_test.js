const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER PAGE ERROR:', error.message));
    page.on('requestfailed', request => {
        console.log('BROWSER REQUEST FAILED:', request.url(), request.failure().errorText);
    });

    try {
        await page.goto('http://localhost:8080/test/flp.html#app-preview', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (e) {
        console.error('Error navigating:', e);
    }
    await browser.close();
})();
