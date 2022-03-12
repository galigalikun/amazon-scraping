import puppeteer, { Browser } from "https://deno.land/x/puppeteer@9.0.2/mod.ts";

const slackWebhookURL = Deno.env.get("SLACK_WEBHOOK_URL") || "";
const amazonSheetURL = Deno.env.get("AMAZON_SHEET_URL") || "";
const chromiumPath = Deno.env.get("CHROMIUM_PATH");
const defaultTime = +(Deno.env.get("DEFAULT_TIME") || "60");
const cacheTime = +(Deno.env.get("CACHE_TIME") || "600");

let amazonListCache: {
  ttl: number;
  data: string[];
} = {
  ttl: 0,
  data: [],
};

const amazonListURL = async (): Promise<string[]> => {
  const dt = new Date();
  const tm = dt.getTime();
  if (amazonListCache.ttl > tm) {
    return amazonListCache.data;
  }
  const res = await fetch(amazonSheetURL, {
    headers: {
      accept: "application/json, text/plain, */*",
    },
    body: undefined,
    redirect: "follow",
    // follow: 3,
    method: "GET",
  });

  amazonListCache = {
    ttl: tm + cacheTime * 1000,
    data: await res.json(),
  };

  return amazonListCache.data;
};

const notification = async (result: {
  url: string;
  title: string | null;
  buy: string | null;
  price: string | null;
}) => {
  await fetch(slackWebhookURL, {
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "check",
      icon_emoji: ":ghost:",
      text: `title:${result.title}\nurl:${result.url}`,
    }),
    method: "POST",
  });
};

const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));

const scraping = async (browser: Browser) => {
  const timer = (Math.floor(Math.random() * 10) + 1) * defaultTime * 1000;
  console.log(`scraping:${timer}`);

  try {
    const amazonList = await amazonListURL();
    for (let i = 0; i < amazonList.length; i++) {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        "Accept-Language": "ja-JP",
      });
      console.log("scraping...", amazonList[i]);
      await page.goto(amazonList[i], { waitUntil: "domcontentloaded" });

      const result = {
        title: (await page.evaluate((el) => el.text, "#title")) as string,
        buy: (await page.evaluate(
          (el) => el.getAttribute("name"),
          "#buy-now-button"
        )) as string,
        price: (await page.evaluate(
          (el) => el.text,
          "#priceblock_ourprice"
        )) as string,
      };

      if (result.buy != null) {
        await notification({
          url: amazonList[i],
          ...result,
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

(async () => {
  console.log(`main start ${chromiumPath}`);
  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    args: ["--no-sandbox", "--lang=ja"],
  });

  await scraping(browser);

  await browser.close();
  console.log("main end");
})();
