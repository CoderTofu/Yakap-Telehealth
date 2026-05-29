# Publishing Telehealth DB to Railway

## Step 1: Push to Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag the image with your Docker Hub username
docker tag yakap-db:latest <your-username>/yakap-db:latest

# Push the image
docker push <your-username>/yakap-db:latest
```

## Step 2: Configure Railway Deployment

### Option A: Use the Dockerfile directly

1. Create a `railway.json` at your project root:
```json
{
  "build": {
    "dockerfile": "docker/Dockerfile.db"
  }
}
```

2. Connect your GitHub repo to Railway
3. Railway will auto-detect and build from `docker/Dockerfile.db`

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize a new project
railway init

# Set environment variables
railway variables set POSTGRES_USER=yakap
railway variables set POSTGRES_PASSWORD=<your-secure-password>
railway variables set POSTGRES_DB=yakap_db

# Deploy
railway up
```

## Step 3: Connect Your API

In your API's `docker-compose.yml` or Railway environment, update the `DATABASE_URL`:

```
postgresql://yakap:<your-password>@<railway-db-host>:5432/yakap_db
```

Railway will provide the host URL after deployment.

## Environment Variables for Railway

Set these in Railway dashboard:
- `POSTGRES_USER`: yakap
- `POSTGRES_PASSWORD`: (use a strong password, not yakap_dev for production)
- `POSTGRES_DB`: yakap_db

## Volumes & Persistence

Railway automatically manages PostgreSQL data persistence via their volumes system. No additional setup needed.

## Health Checks

The Dockerfile includes a HEALTHCHECK that Railway will use to monitor your database service.
