# Deployment Guide - Elite Life Dashboard

## Coolify Deployment

### Prerequisites
- Coolify instance running
- GitHub repository connected to Coolify
- Domain configured (optional)

### Environment Variables

Add these environment variables in Coolify:

```env
NEXT_PUBLIC_SUPABASE_URL=https://elitelifedb.pyramedia.cloud
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Deployment Steps

#### Option 1: Dockerfile (Recommended)

1. **Create New Resource** in Coolify
2. Select **Docker** as the build method
3. Connect your GitHub repository: `https://github.com/Engmohammedabdo/dashboard-elitelife`
4. Set branch to `main`
5. Coolify will automatically detect the `Dockerfile`
6. Add environment variables (see above)
7. Set port to `3000`
8. Deploy!

#### Option 2: Nixpacks (Auto-detect)

1. **Create New Resource** in Coolify
2. Select **Nixpacks** as the build method
3. Connect your GitHub repository
4. Add environment variables
5. Set start command: `npm start`
6. Set port to `3000`
7. Deploy!

### Build Arguments (Docker)

If using Dockerfile, set these as build arguments:

```
NEXT_PUBLIC_SUPABASE_URL=https://elitelifedb.pyramedia.cloud
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here
```

### Health Check

The app runs on port 3000. You can verify it's working by accessing:
- `https://your-domain.com/ar` (Arabic)
- `https://your-domain.com/en` (English)

### Troubleshooting

#### Build Fails
- Check Node.js version (requires Node 20+)
- Verify environment variables are set correctly
- Check build logs for TypeScript errors

#### App Not Loading
- Verify port 3000 is exposed
- Check environment variables are accessible at runtime
- Verify Supabase connection

#### Charts Not Rendering
- This is normal during SSG build (chart warnings)
- Charts will render correctly in the browser

### Resources

- **Repository**: https://github.com/Engmohammedabdo/dashboard-elitelife
- **Port**: 3000
- **Node Version**: 20+
- **Build Command**: `npm run build`
- **Start Command**: `npm start` or `node server.js` (standalone)

### URLs After Deployment

| Page | Arabic | English |
|------|--------|---------|
| Dashboard | `/ar` | `/en` |
| Conversations | `/ar/conversations` | `/en/conversations` |
| Patients | `/ar/patients` | `/en/patients` |
| Reliability | `/ar/reliability` | `/en/reliability` |
| AI Report | `/ar/ai-report` | `/en/ai-report` |
| Settings | `/ar/settings` | `/en/settings` |
