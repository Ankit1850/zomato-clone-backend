# Feastify - Custom Domain, DNS & Production Deployment Guide

This guide walks you through connecting your custom domain (e.g., `feastify.app`, `yourbrand.com`, or `foodie.com`) to your Feastify app with automatic HTTPS/SSL and production reverse proxying.

---

## 1. Prerequisites
- A registered domain from any registrar (GoDaddy, Namecheap, Google Domains / Squarespace, Porkbun, or Cloudflare Registrar).
- A server or cloud hosting platform where Feastify is running (VPS like DigitalOcean/AWS/Linode, or serverless hosts like Render/Railway/Vercel).

---

## 2. Option A: Cloud Hosting with Free SSL (Simplest)

### A. Deploy to Render (Recommended for Free Fullstack)
1. Push your repository to GitHub or GitLab.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** > **Web Service**.
3. Select your repository.
4. Settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free
5. Go to **Settings** > **Custom Domains** in your Render service.
6. Enter `yourdomain.com` and `www.yourdomain.com`.
7. Render will provide DNS records:
   - **CNAME:** `www` -> `feastify-app.onrender.com`
   - **ANAME/ALIAS or A Record:** `@` -> IP provided by Render.
8. Render provisions an automatic Let's Encrypt SSL certificate within 5 minutes.

### B. Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` from the `feastify` directory.
3. In Vercel Project Settings > **Domains**, add `yourdomain.com`.
4. Point your DNS records as instructed by Vercel:
   - Type: `A`, Name: `@`, Value: `76.76.21.21`
   - Type: `CNAME`, Name: `www`, Value: `cname.vercel-dns.com`

---

## 3. Option B: Self-Hosted VPS (DigitalOcean / AWS EC2 / Ubuntu)

### Step 1: Point Your DNS Records
In your Domain Registrar / Cloudflare DNS Management:

| Type | Name | Value | TTL | Proxy Status |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (root) | `YOUR_SERVER_PUBLIC_IP` | Auto / 300 | DNS Only (or Proxied) |
| **CNAME** | `www` | `yourdomain.com` | Auto / 300 | DNS Only (or Proxied) |

---

### Step 2: Run Feastify via Docker or PM2

#### Using Docker:
```bash
docker compose up -d
```

#### Or Using PM2 Process Manager:
```bash
npm install -g pm2
npm install --production
pm2 start server.js --name "feastify"
pm2 save
pm2 startup
```

---

### Step 3: Configure Nginx as Reverse Proxy
Install Nginx:
```bash
sudo apt update
sudo apt install nginx -y
```

Create a site configuration file:
```bash
sudo nano /etc/nginx/sites-available/feastify
```

Paste the following configuration (replace `yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/feastify /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 4: Install Free SSL Certificate (Certbot)
Obtain a 100% free, auto-renewing SSL certificate from Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Select the option to automatically redirect all HTTP traffic to HTTPS (option 2).

Certbot will configure your SSL and set up a systemd cron job for automatic renewal every 90 days.

---

## 4. Verification
1. Open your browser and navigate to `https://yourdomain.com`.
2. Ensure the padlock icon appears in the address bar.
3. Verify live order tracking and map tiles render smoothly over HTTPS.
