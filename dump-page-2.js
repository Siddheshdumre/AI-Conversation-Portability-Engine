const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');

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

        console.log("Dumping specific variables...");

        const dump = await page.evaluate(() => {
            return {
                reactRouterContext: window.__reactRouterContext ? "EXISTS" : "MISSING",
                reactQueryCache: window.__REACT_QUERY_CACHE__ ? "EXISTS" : "MISSING",
                reactQueryCacheData: window.__REACT_QUERY_CACHE__ ? JSON.stringify(window.__REACT_QUERY_CACHE__).substring(0, 1000) : null,
                reactRouterContextData: window.__reactRouterContext ? JSON.stringify(window.__reactRouterContext).substring(0, 1000) : null,
                allReactQueryKeys: window.__REACT_QUERY_CACHE__ && window.__REACT_QUERY_CACHE__.queries ? window.__REACT_QUERY_CACHE__.queries.map(q => q.queryKey) : [],
            };
        });

        console.log("Dump:", JSON.stringify(dump, null, 2));

        // Let's also search the raw HTML for the word "mapping" to see if it's embedded in one of the script tags.
        const html = await page.content();
        const mappingIndex = html.indexOf('"mapping":');
        if (mappingIndex !== -1) {
            console.log("FOUND MAPPING IN HTML AT:", mappingIndex);
            console.log("Context:", html.substring(mappingIndex - 100, mappingIndex + 200));
        } else {
            console.log("MAPPING NOT FOUND IN HTML");
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (browser) await browser.close();
    }
})();
