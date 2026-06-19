FROM node:20-slim

# 安装 Puppeteer 需要的系统依赖和中文字体 (以 Debian/Ubuntu 为例)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-noto-cjk \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001
CMD [ "npm", "start" ]