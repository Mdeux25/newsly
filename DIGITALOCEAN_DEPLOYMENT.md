# 🌊 Newsly - DigitalOcean Deployment ($6/month)

Cheapest always-on deployment with full control.

---

## 💰 Total Cost: $6/month

**What you get**:
- ✅ 1GB RAM Droplet
- ✅ 1 CPU core
- ✅ 25GB SSD (way more than you need!)
- ✅ MySQL on same server
- ✅ Always on (no cold starts)
- ✅ Full control

**Perfect for**: Budget production, always-on, real users

---

## 🚀 Quick Deployment (15 minutes)

### Step 1: Create Droplet

1. Go to: https://cloud.digitalocean.com/
2. Click "**Create**" → "**Droplet**"
3. Choose:
   - **Image**: Docker on Ubuntu 22.04
   - **Plan**: Basic
   - **CPU**: Regular - $6/month (1GB RAM)
   - **Region**: Closest to your users
   - **Authentication**: SSH key (recommended) or password
   - **Hostname**: newsly
4. Click "**Create Droplet**"
5. Wait 1 minute for creation
6. Copy your droplet's IP address

### Step 2: Connect to Your Server

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y
```

### Step 3: Clone Your Repository

```bash
# Install git (if not present)
apt install -y git

# Clone your repository
cd /root
git clone https://github.com/Mdeux25/newsly.git
cd newsly
```

### Step 4: Configure Environment Variables

```bash
# Copy environment template
cp .env.docker .env

# Edit with your API keys
nano .env
```

Add your keys:
```bash
NEWSAPI_KEY=3c625d41c30049f785169bc0c2a3ac1f
NEWSDATA_KEY=pub_cb9ac8dd080d42bfa6894eb57f4bad9b
OPENAI_API_KEY=sk-proj-METP...your-key...
GNEWS_KEY=optional
TWITTER_BEARER_TOKEN=optional
```

Save and exit (Ctrl+X, Y, Enter)

### Step 5: Start Everything with Docker

```bash
# Start services (includes MySQL!)
docker compose up -d

# Wait 30 seconds for MySQL to initialize
sleep 30

# Check status
docker compose ps

# Should show:
# newsly-mysql    running
# newsly-app      running
```

### Step 6: Configure Firewall

```bash
# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp  # SSH (important!)
ufw enable

# Check status
ufw status
```

### Step 7: Access Your App

Visit: `http://your-droplet-ip:8080`

Check API: `http://your-droplet-ip:8080/api/status`

---

## 🌐 Add Domain & SSL (Optional)

### Setup Nginx Reverse Proxy

```bash
# Install Nginx
apt install -y nginx

# Create config
cat > /etc/nginx/sites-available/newsly << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Change this!

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/newsly /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Add SSL with Let's Encrypt (Free HTTPS)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal is configured!
```

Now access: `https://your-domain.com` ✅

---

## 📊 Import Your Database

### Option 1: From Local Backup

```bash
# From your local machine
scp backups/newsly_backup_*.sql.gz root@your-droplet-ip:/root/newsly/backups/

# On the droplet
cd /root/newsly
./import-database.sh backups/newsly_backup_*.sql.gz
```

### Option 2: Start Fresh

Migrations run automatically - just start using the app!

---

## 🔄 Auto-Deploy on Git Push (Optional)

### Setup Webhook

```bash
# Install webhook tool
apt install -y webhook

# Create deploy script
cat > /root/deploy.sh << 'EOF'
#!/bin/bash
cd /root/newsly
git pull origin main
docker compose build newsly
docker compose up -d newsly
EOF

chmod +x /root/deploy.sh
```

Then configure GitHub webhook to call your server on push.

---

## 📈 Monitoring & Maintenance

### Check Logs

```bash
# View logs
docker compose logs -f newsly

# View MySQL logs
docker compose logs -f mysql

# Check resource usage
docker stats
```

### Database Backup (Automated)

```bash
# Create daily backup cron job
crontab -e
```

Add:
```cron
# Daily backup at 2 AM
0 2 * * * cd /root/newsly && docker exec newsly-mysql mysqldump -u news_user -pnews_password news_aggregator | gzip > backups/auto_backup_$(date +\%Y\%m\%d).sql.gz

# Keep only last 7 days
0 3 * * * find /root/newsly/backups/auto_backup_*.sql.gz -mtime +7 -delete
```

### Monitor Disk Space

```bash
# Check disk usage
df -h

# Your database should be ~100 MB
du -sh /var/lib/docker/volumes/newsly_mysql-data
```

### Update Application

```bash
cd /root/newsly
git pull origin main
docker compose build newsly
docker compose up -d newsly
```

---

## 💰 Cost Breakdown

**DigitalOcean Droplet**: $6/month
- 1GB RAM
- 1 CPU
- 25GB SSD storage
- 1TB transfer
- MySQL included (no extra cost!)

**Total**: **$6/month** 🎉

**vs Render**:
- Render Web ($7) + DB ($7) = $14/month
- DigitalOcean = **$6/month**
- **Savings: $8/month ($96/year)**

---

## ⚡ Performance Comparison

| Feature | DigitalOcean | Render |
|---------|-------------|--------|
| Cost | $6/mo | $14/mo (or free with cold starts) |
| Always On | ✅ Yes | ✅ Yes (paid) / ❌ No (free) |
| Cold Starts | ✅ Never | ❌ On free tier |
| Storage | 25 GB | 1 GB |
| Control | ✅ Full | ⚠️ Limited |
| Maintenance | ⚠️ You manage | ✅ Managed |
| SSL | ✅ Free (Let's Encrypt) | ✅ Free (included) |
| Backups | ⚠️ Manual setup | ✅ Automatic (paid) |

**Best for**:
- **DigitalOcean**: Budget-conscious, want control, tech-savvy
- **Render**: Want zero maintenance, willing to pay more

---

## 🔒 Security Best Practices

### 1. Change Database Passwords

Edit `docker-compose.yml`:
```yaml
environment:
  MYSQL_ROOT_PASSWORD: your-strong-password
  MYSQL_PASSWORD: your-strong-password
```

### 2. Enable Firewall (Already Done)

```bash
ufw status
# Should show: 80, 443, 22 allowed
```

### 3. Setup SSH Keys (Recommended)

```bash
# On your local machine
ssh-copy-id root@your-droplet-ip

# Then disable password auth
nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
systemctl restart ssh
```

### 4. Regular Updates

```bash
# Create weekly update cron
crontab -e
```

Add:
```cron
# Weekly updates on Sunday 3 AM
0 3 * * 0 apt update && apt upgrade -y && docker system prune -f
```

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
docker compose logs newsly
docker compose logs mysql
```

### Database Connection Error

```bash
# Check MySQL is running
docker exec newsly-mysql mysql -u news_user -pnews_password -e "SHOW DATABASES;"
```

### Out of Memory

```bash
# Check memory
free -h

# Add swap if needed
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Slow Performance

```bash
# Check CPU/RAM usage
htop

# Check disk I/O
iotop
```

---

## 📈 Scaling Options

### Upgrade Droplet Size

1. Power off droplet
2. Resize in DO dashboard
3. Power back on

**Options**:
- $12/mo: 2GB RAM (2x performance)
- $18/mo: 2GB RAM + 2 CPUs
- $24/mo: 4GB RAM

### Add Load Balancer

For high traffic, add DO Load Balancer ($12/mo):
1. Create multiple droplets
2. Add load balancer
3. Distribute traffic

---

## ✅ Deployment Checklist

- [ ] Create $6/mo DigitalOcean Droplet (Docker image)
- [ ] SSH into server
- [ ] Clone GitHub repository
- [ ] Configure `.env` with API keys
- [ ] Run `docker compose up -d`
- [ ] Configure firewall (ufw)
- [ ] Import database backup (optional)
- [ ] Setup Nginx reverse proxy (optional)
- [ ] Add SSL certificate (optional)
- [ ] Configure automated backups
- [ ] Test application: http://droplet-ip:8080

---

## 🎯 Quick Commands Reference

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart app
docker compose restart newsly

# Update app
git pull && docker compose build newsly && docker compose up -d newsly

# Backup database
docker exec newsly-mysql mysqldump -u news_user -pnews_password news_aggregator > backup.sql

# Check resource usage
docker stats
htop
```

---

## 💡 Tips & Tricks

1. **Use DO Monitoring** (free):
   - Enable in droplet settings
   - Get alerts for high CPU/memory

2. **Enable Droplet Backups** (+20% cost = $1.20/mo):
   - Automatic weekly snapshots
   - Easy disaster recovery

3. **Reserved IP** (free):
   - Get static IP that doesn't change
   - Good for DNS

4. **Use DO Spaces** for images ($5/mo):
   - Offload article images
   - Reduce droplet storage

---

## 🆚 Final Verdict: DigitalOcean vs Render

**Choose DigitalOcean if**:
- ✅ Want cheapest always-on ($6/mo)
- ✅ Comfortable with servers
- ✅ Want full control
- ✅ Need more storage

**Choose Render if**:
- ✅ Want zero maintenance
- ✅ Don't want to manage servers
- ✅ OK with $14/mo or cold starts
- ✅ Value simplicity

**My Recommendation**:
- **Testing**: Render FREE (with Aiven DB)
- **Production on budget**: DigitalOcean ($6/mo)
- **Production easy mode**: Render Starter ($7/mo) + Aiven FREE

---

**Total Setup Time**: 15 minutes
**Monthly Cost**: $6
**Maintenance**: 10 minutes/month

**Ready to deploy?** 🚀
