# 🐳 Newsly Docker Deployment Guide

Complete guide to deploy Newsly to a public server with Docker.

---

## 📋 Prerequisites

On your server, you need:
- Docker Engine (20.10+)
- Docker Compose (2.0+)
- At least 2GB RAM
- 10GB disk space

### Install Docker (Ubuntu/Debian)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

Log out and back in, then verify:
```bash
docker --version
docker compose version
```

---

## 🚀 Deployment Steps

### Step 1: Export Database from Current Machine

On your **current machine**:
```bash
cd /Users/me-mac/projects/news-aggregator

# Export database with all your articles
./export-database.sh

# This creates: backups/newsly_backup_TIMESTAMP.sql.gz
```

### Step 2: Push Everything to GitHub

```bash
# Add new files
git add .
git commit -m "chore: add Docker deployment files and database export scripts"
git push origin main
```

### Step 3: Setup on Server

SSH into your server:
```bash
ssh user@your-server.com
```

Clone the repository:
```bash
cd ~
git clone https://github.com/Mdeux25/newsly.git
cd newsly
```

### Step 4: Configure Environment Variables

Create `.env` file with your API keys:
```bash
cp .env.docker .env
nano .env  # or vim .env
```

Add your real API keys:
```bash
NEWSAPI_KEY=your_newsapi_key_here
NEWSDATA_KEY=your_newsdata_key_here
GNEWS_KEY=your_gnews_key_here
TWITTER_BEARER_TOKEN=your_twitter_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 5: Upload Database Backup

From your **local machine**, copy the backup to server:
```bash
scp backups/newsly_backup_*.sql.gz user@your-server.com:~/newsly/backups/
```

### Step 6: Build and Start Containers

On the **server**:
```bash
cd ~/newsly

# Build the Docker image
docker compose build

# Start MySQL first (to initialize database)
docker compose up -d mysql

# Wait 30 seconds for MySQL to initialize
sleep 30

# Import your database
./import-database.sh backups/newsly_backup_*.sql.gz

# Start the main application
docker compose up -d newsly

# Check status
docker compose ps
docker compose logs -f newsly
```

### Step 7: Verify Deployment

Check if everything is running:
```bash
# Check containers
docker compose ps

# Should show:
# newsly-mysql    running
# newsly-app      running

# Test the API
curl http://localhost:8080/api/status

# Check logs
docker compose logs newsly
```

Access your app:
- **Application**: `http://your-server-ip:8080`
- **API Status**: `http://your-server-ip:8080/api/status`

---

## 🔧 Server Configuration

### Configure Firewall

Allow traffic on port 8080:
```bash
# UFW (Ubuntu)
sudo ufw allow 8080/tcp
sudo ufw status

# Or iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

### Setup Nginx Reverse Proxy (Optional but Recommended)

Install Nginx:
```bash
sudo apt update
sudo apt install nginx
```

Create Nginx config:
```bash
sudo nano /etc/nginx/sites-available/newsly
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your server IP

    location / {
        proxy_pass http://localhost:8080;
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

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/newsly /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Now access via: `http://your-domain.com` or `http://your-server-ip`

### Setup SSL with Let's Encrypt (Recommended)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Now access via HTTPS: `https://your-domain.com`

---

## 🔄 Management Commands

### Start/Stop Services
```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart a service
docker compose restart newsly

# View logs
docker compose logs -f newsly
docker compose logs -f mysql
```

### Database Backup on Server
```bash
# Create backup
docker exec newsly-mysql mysqldump -u news_user -pnews_password news_aggregator | gzip > backup_$(date +%Y%m%d).sql.gz

# Download backup to local machine
scp user@your-server.com:~/newsly/backup_*.sql.gz ./backups/
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose build newsly
docker compose up -d newsly

# Check logs
docker compose logs -f newsly
```

### Monitor Resources
```bash
# Check container stats
docker stats

# Check disk usage
docker system df

# Cleanup unused images
docker system prune -a
```

---

## 🔒 Security Best Practices

### 1. Secure Database Passwords
Edit `docker-compose.yml` and change default passwords:
```yaml
environment:
  MYSQL_ROOT_PASSWORD: <strong-random-password>
  MYSQL_PASSWORD: <strong-random-password>
```

### 2. Firewall Configuration
Only allow necessary ports:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Regular Updates
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker compose pull
docker compose up -d
```

### 4. Enable Auto-Restart
Already configured with `restart: unless-stopped` in docker-compose.yml

### 5. Monitor Logs
```bash
# Setup log rotation
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:
```bash
sudo systemctl restart docker
```

---

## 📊 Monitoring & Maintenance

### Health Checks
The app includes health checks:
```bash
# Check app health
curl http://localhost:8080/api/status

# Check MySQL health
docker exec newsly-mysql mysqladmin ping -u root -prootpassword
```

### View Application Stats
```bash
# LLM usage and costs
curl http://localhost:8080/api/status | jq '.llm'

# Database stats
curl http://localhost:8080/api/status | jq '.database'

# API quotas
curl http://localhost:8080/api/status | jq '.apiQuotas'
```

### Scheduled Backups
Create a cron job for daily backups:
```bash
crontab -e
```

Add:
```cron
# Daily backup at 2 AM
0 2 * * * cd ~/newsly && docker exec newsly-mysql mysqldump -u news_user -pnews_password news_aggregator | gzip > backups/auto_backup_$(date +\%Y\%m\%d).sql.gz

# Keep only last 7 days of backups
0 3 * * * find ~/newsly/backups/auto_backup_*.sql.gz -mtime +7 -delete
```

---

## 🐛 Troubleshooting

### Container Won't Start
```bash
# Check logs
docker compose logs newsly

# Check if port is already in use
sudo lsof -i :8080

# Restart everything
docker compose down
docker compose up -d
```

### Database Connection Issues
```bash
# Check MySQL is running
docker compose ps mysql

# Test connection
docker exec newsly-mysql mysql -u news_user -pnews_password -e "SHOW DATABASES;"

# Check container network
docker network inspect newsly_default
```

### Out of Memory
```bash
# Check memory usage
free -h
docker stats

# Increase swap (if needed)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Slow Performance
```bash
# Check resource usage
docker stats

# Optimize MySQL
docker exec newsly-mysql mysql -u root -prootpassword -e "
  SET GLOBAL innodb_buffer_pool_size=512*1024*1024;
"
```

---

## 📈 Scaling Options

### Horizontal Scaling (Multiple Instances)
For high traffic, you can run multiple instances behind a load balancer:

```yaml
# Add to docker-compose.yml
services:
  newsly-1:
    extends: newsly
    container_name: newsly-app-1
    ports:
      - "8081:3001"

  newsly-2:
    extends: newsly
    container_name: newsly-app-2
    ports:
      - "8082:3001"

  nginx-lb:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
    depends_on:
      - newsly-1
      - newsly-2
```

### Database Replication
For production, consider MySQL replication or managed databases:
- AWS RDS
- Google Cloud SQL
- DigitalOcean Managed Databases

### Redis Caching (Advanced)
Add Redis for improved performance:
```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

---

## 💰 Cost Estimation

### Server Requirements
- **Minimum**: 2GB RAM, 1 CPU, 10GB disk (~$5-10/month)
- **Recommended**: 4GB RAM, 2 CPU, 20GB disk (~$20/month)

### Providers
- **DigitalOcean**: $6/month (1GB), $12/month (2GB)
- **Linode**: $5/month (1GB), $10/month (2GB)
- **AWS Lightsail**: $5/month (1GB), $10/month (2GB)
- **Hetzner**: €4.5/month (2GB)

### API Costs
- OpenAI: ~$0.50/month (with caching)
- NewsAPI: Free tier (100 requests/day)
- NewsData: Free tier (200 requests/day)

**Total estimated cost**: $10-25/month

---

## ✅ Deployment Checklist

Before going live:

- [ ] Export database from local machine
- [ ] Push code to GitHub
- [ ] Server has Docker installed
- [ ] Clone repository on server
- [ ] Configure `.env` with all API keys
- [ ] Import database backup
- [ ] Start containers with `docker compose up -d`
- [ ] Verify health: `curl http://localhost:8080/api/status`
- [ ] Configure firewall (allow port 8080 or 80/443)
- [ ] Setup Nginx reverse proxy (optional)
- [ ] Setup SSL certificate (recommended)
- [ ] Setup automated backups
- [ ] Test smart search functionality
- [ ] Monitor LLM costs and cache performance

---

## 🆘 Support

If you encounter issues:

1. **Check logs**: `docker compose logs -f newsly`
2. **Check GitHub Issues**: https://github.com/Mdeux25/newsly/issues
3. **Documentation**: See `NEWSLY_IMPLEMENTATION_SUMMARY.md`

---

**Happy Deploying! 🚀**
