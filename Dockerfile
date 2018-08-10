FROM node:8.9.4-alpine as builder
COPY . /usr/src/nelson

WORKDIR /usr/src/nelson
RUN npm install -g

EXPOSE 16600
EXPOSE 18600

CMD ["/usr/local/bin/nelson"]
ENTRYPOINT ["/usr/local/bin/nelson"]
