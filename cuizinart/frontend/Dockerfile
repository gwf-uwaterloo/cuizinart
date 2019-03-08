FROM node:11

RUN mkdir -p /usr/src/app
ADD . /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/package.json
RUN npm install

CMD ["npm", "start"]


