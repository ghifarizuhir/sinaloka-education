FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

RUN npx prisma generate && \
    node -e "require('fs').writeFileSync('generated/prisma/package.json', JSON.stringify({name:'@generated/prisma',type:'module',main:'./client.js',types:'./client.ts'}, null, 2))"

COPY . .

RUN npm run build

RUN mkdir -p uploads

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
