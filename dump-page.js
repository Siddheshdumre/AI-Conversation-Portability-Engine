const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

(async () => {
    let browser;
    try {
        const executablePath = process.env.NODE_ENV === 'development' || process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : await chromium.executablePath();

        browser = await puppeteer.launch({
            args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
            executablePath,
            headless: true,
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        );

        console.log("Loading page...");
        await page.goto('https://chatgpt.com/share/699fe439-1d38-8002-8576-7602dee4350f', { waitUntil: 'domcontentloaded' });
        await page.waitForNetworkIdle({ idleTime: 2000, timeout: 15000 }).catch(() => console.log("Network idle timeout"));

        console.log("Dumping window variables...");
        const windowKeys = await page.evaluate(() => {
            return Object.keys(window).filter(k => k.startsWith('__'));
        });
        console.log("Window keys starting with __ :", windowKeys);

        console.log("Checking for __remixContext type:", await page.evaluate(() => typeof window.__remixContext));
        console.log("Checking for __NEXT_DATA__ type:", await page.evaluate(() => typeof window.__NEXT_DATA__));

        // Let's dump the raw HTML of the body just in case
        const bodyHtml = await page.evaluate(() => document.body.innerHTML);
        const scriptTags = await page.evaluate(() => Array.from(document.querySelectorAll('script')).map(s => s.id || s.className || s.src || 'inline script (length: ' + s.innerHTML.length + ')'));
        console.log("Script tags on page:", scriptTags);

    } catch (e) {
        console.error(e);
    } finally {
        if (browser) await browser.close();
    }
})();
