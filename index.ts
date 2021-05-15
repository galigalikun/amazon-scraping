import puppeteer from "puppeteer";
import fetch from "node-fetch";

const slackWebhookURL = process.env.SLACK_WEBHOOK_URL || "";
const amazonSheetURL = process.env.AMAZON_SHEET_URL || "";
const chromiumPath = process.env.CHROMIUM_PATH;
const defaultTime = +(process.env.DEFAULT_TIME || "60");

const amazonListURL = async ():Promise<string[]> => {
    const res = await fetch(amazonSheetURL, {
        headers: {
            accept: "application/json, text/plain, */*"
        },
        body: undefined,
        redirect: "follow",
        follow: 3,
        method: "GET"
    });

    return await res.json();
};

const notification = async (result: {
    url: string;
    title: string | null | undefined;
    buy: string | null | undefined;
    price: string | null | undefined;
}) => {
    await fetch(slackWebhookURL, {
        headers: {
           "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: "check",
            icon_emoji: ":ghost:",
            text: `title:${result.title}\nurl:${result.url}`
        }),
        method: "POST"
    });
};

const sleep = (msec: number) =>
  new Promise(resolve => setTimeout(resolve, msec));

const scraping = async (browser: puppeteer.Browser) => {
    const timer = (Math.floor(Math.random() * 10) + 1) * defaultTime * 1000;
    console.log(`scraping:${timer}`);

    try {
        const amazonList = await amazonListURL();
        for (let i = 0; i < amazonList.length; i++) {
            const page = await browser.newPage();
            await page.setExtraHTTPHeaders({
                "Accept-Language": "ja-JP"
            });
            console.log("scraping...", amazonList[i]);
            await page.goto(amazonList[i], { waitUntil: "domcontentloaded" });

            const result = await page.evaluate(() => {
                return {
                    title: document.querySelector("#title")?.textContent,
                    buy: document.querySelector("#buy-now-button")?.getAttribute("name"),
                    price: document.querySelector("#priceblock_ourprice")?.textContent
                };
            });

            if (result.buy != undefined) {
                await notification({
                    url: amazonList[i],
                    ...result
                });
            }

            await page.close();
        }

    } catch (e) {
        console.error(e);
    }

    await sleep(timer);
    await scraping(browser);
};


(async() => {
    console.log("main start");
    const browser = await puppeteer.launch({
        executablePath: chromiumPath,
        args: ["--no-sandbox", "--lang=ja"]
    });

    await scraping(browser);

    await browser.close();
    console.log("main end");
})();
