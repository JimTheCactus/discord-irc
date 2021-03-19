FROM node:12-alpine
ENV LIBRARY_PATH=/lib:/usr/lib

RUN mkdir /bot
WORKDIR /bot

RUN apk add --update tini

COPY . /bot

RUN npm install && \
	npm run build && \
	mkdir /config

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start", "--", "--config", "/config/config.json"]
