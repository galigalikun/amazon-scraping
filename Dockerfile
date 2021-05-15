FROM node:14-alpine

WORKDIR /app

RUN apk add --no-cache \
    curl \
    udev \
    ttf-freefont \
    chromium \
    nss && \
    curl -o- -L https://yarnpkg.com/install.sh | sh

# アプリケーションのソースをバンドルする
COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV CHROMIUM_PATH /usr/bin/chromium-browser
ENV PATH $HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH

RUN yarn install

CMD [ "yarn", "scraping"]
