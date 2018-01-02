FROM node:6.9.5-alpine as builder
COPY . /usr/src/nelson

WORKDIR /usr/src/nelson
RUN npm install -g yarn \
    && yarn install --pure-lockfile \
    && npm install -g . \
    && npm uninstall -g yarn

FROM node:6.9.5-alpine
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules

EXPOSE 16600
EXPOSE 18600

CMD ["/usr/local/bin/nelson"]
ENTRYPOINT ["/usr/local/bin/nelson"]
