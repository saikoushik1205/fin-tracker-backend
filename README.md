# FinTrack Backend

Backend API for FinTrack application.

## Environment Variables

Required environment variables for deployment:

```
MONGO_URI=mongodb+srv://koushiksai242_db_user:Koushiksai2006@financialtracker-01.uzuscjs.mongodb.net/fintrack?authSource=admin&retryWrites=true&w=majority
JWT_SECRET=d84101ea1d3a03e23635a15f89bc7903f513c9e8cdd9ea080da1593a6f6280193b9d0f06c643224ea1a5e4bb2544017cf819897946521898849945a5ef595b39
JWT_EXPIRES_IN=12h
NODE_ENV=production
FRONTEND_URL=https://finance-tracker-frontend-phi.vercel.app
```

## Deploy to Vercel

1. Push this folder to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import the repository
4. Add environment variables
5. Deploy!

## Local Development

```bash
npm install
npm start
```

API will be available at: http://localhost:3000/api
