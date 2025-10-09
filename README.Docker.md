# Docker Setup for WTF Game API

This NestJS application has been dockerized with both production and development configurations.

## Quick Start

### Environment Setup
First, create your environment file:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
# Make sure to set:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY  
# - STEAM_API_KEY
# - STEAM_APP_ID
# - ENGINE_API_KEY
```

### Production Build
```bash
# Build and run with Docker Compose
yarn docker:compose:up

# Or build and run manually
yarn docker:build
yarn docker:run
```

### Development Build
```bash
# Run development environment with hot reload
yarn docker:compose:dev

# Or build and run manually
yarn docker:build:dev
yarn docker:run:dev
```

## Available Docker Scripts

- `yarn docker:build` - Build production Docker image
- `yarn docker:build:dev` - Build development Docker image
- `yarn docker:run` - Run production container
- `yarn docker:run:dev` - Run development container with volume mounts
- `yarn docker:compose:up` - Start production environment with Docker Compose
- `yarn docker:compose:down` - Stop Docker Compose services
- `yarn docker:compose:dev` - Start development environment with Docker Compose
- `yarn docker:logs` - View application logs
- `yarn docker:clean` - Clean up Docker system and volumes

## Docker Files Structure

- `Dockerfile` - Multi-stage production build
- `Dockerfile.dev` - Development build with hot reload
- `docker-compose.yml` - Production and development services
- `.dockerignore` - Excludes unnecessary files from Docker context

## Features

### Production Dockerfile
- Multi-stage build for optimized image size
- Non-root user for security
- Health checks
- Only production dependencies

### Development Dockerfile
- Hot reload support
- Volume mounts for live code changes
- All dependencies included
- Non-root user for security

## API Access

Once running, the API will be available at:
- Application: http://localhost:3005
- Swagger Documentation: http://localhost:3005/api

## Environment Variables

You can customize the application by setting environment variables in your Docker Compose file or when running containers manually.

## Security Features

- Non-root user execution
- Minimal image footprint
- Health checks
- Docker security best practices
