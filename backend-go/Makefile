# Makefile for Golang CCTV Backend

.PHONY: help build run test clean docker-build docker-run

help:
	@echo "Available commands:"
	@echo "  make build        - Build the application"
	@echo "  make run          - Run the application"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run Docker container"

build:
	go build -o bin/server ./cmd/server

run:
	go run ./cmd/server/main.go

test:
	go test -v ./...

clean:
	rm -rf bin/
	go clean

docker-build:
	docker build -t cctv-backend-go .

docker-run:
	docker run -p 3000:3000 --env-file .env cctv-backend-go

deps:
	go mod download
	go mod tidy

fmt:
	go fmt ./...

lint:
	golangci-lint run
