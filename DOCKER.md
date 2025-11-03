# Docker Setup for WTF Server

This document explains how to run the WTF Server application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (usually comes with Docker Desktop)

## Quick Start

### Production Mode

```bash
# Build and run in production mode
yarn docker:prod

# Or using docker-compose directly
docker-compose up --build
```

### Development Mode

```bash
# Run in development mode with hot reload
yarn docker:dev

# Or using docker-compose directly
docker-compose -f docker-compose.dev.yml up --build
```

## Available Commands

- `yarn docker:build` - Build the Docker image
- `yarn docker:run` - Run the container directly
- `yarn docker:dev` - Run in development mode with hot reload
- `yarn docker:prod` - Run in production mode
- `yarn docker:down` - Stop all containers

## Accessing the Application

- **API**: http://localhost:3005
- **Swagger Documentation**: http://localhost:3005/api

## Docker Files

- `Dockerfile` - Production Docker configuration
- `docker-compose.yml` - Production compose configuration
- `docker-compose.dev.yml` - Development compose configuration
- `.dockerignore` - Files to exclude from Docker build context

## Environment Variables

You need to set the following environment variables for the application to work:

### Required Variables

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `STEAM_API_KEY` - Your Steam API key
- `STEAM_APP_ID` - Your Steam application ID
- `ENGINE_API_KEY` - Your Engine API key

### Optional Variables

- `NODE_ENV` - Environment (production/development)
- `PORT` - Port number (default: 3005)

### Setting Environment Variables

You can set environment variables in several ways:

1. **Using a .env file** (recommended):
```bash
# Create a .env file in the project root
echo "SUPABASE_URL=your_supabase_url_here" > .env
echo "SUPABASE_ANON_KEY=your_supabase_anon_key_here" >> .env
echo "STEAM_API_KEY=your_steam_api_key_here" >> .env
echo "STEAM_APP_ID=your_steam_app_id_here" >> .env
echo "ENGINE_API_KEY=your_engine_api_key_here" >> .env
```

2. **Using environment variables directly**:
```bash
export SUPABASE_URL=your_supabase_url_here
export SUPABASE_ANON_KEY=your_supabase_anon_key_here
export STEAM_API_KEY=your_steam_api_key_here
export STEAM_APP_ID=your_steam_app_id_here
export ENGINE_API_KEY=your_engine_api_key_here
```

3. **Using docker-compose with environment file**:
```yaml
services:
  wtf-server:
    env_file:
      - .env
```

## Health Checks

The production setup includes health checks that verify the application is running correctly.

## Troubleshooting

1. **Port already in use**: Make sure port 3005 is not being used by another application
2. **Build issues**: Try running `docker-compose down` and then rebuild
3. **Permission issues**: Make sure Docker has proper permissions on your system
