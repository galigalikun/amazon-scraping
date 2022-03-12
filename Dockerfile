FROM denoland/deno:1.19.2

WORKDIR /app


RUN apt-get update \
    && apt-get install -y chromium fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# アプリケーションのソースをバンドルする
COPY . .

ENV PUPPETEER_PRODUCT chrome
ENV CHROMIUM_PATH /usr/bin/chromium

CMD [ "run", "--unstable", "--allow-net", "--allow-env", "--allow-write", "--allow-run", "index.ts"]
