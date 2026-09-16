FROM golang:1.27.1-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY main.go ./

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o formaly-storage main.go


FROM alpine:3.22

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/formaly-storage /app/formaly-storage

RUN mkdir -p /app/uploads

EXPOSE 48484

CMD ["/app/formaly-storage"]