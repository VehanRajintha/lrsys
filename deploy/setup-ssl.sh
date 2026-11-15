#!/usr/bin/env bash
# ==============================================================================
# LRSYS - Automated HTTPS / SSL Setup Script (Let's Encrypt + Certbot)
# Usage:
#   sudo bash deploy/setup-ssl.sh [optional_domain]
#
# Examples:
#   sudo bash deploy/setup-ssl.sh cusdec.yourdomain.com
#   sudo bash deploy/setup-ssl.sh              (auto-detects IP with sslip.io)
# ==============================================================================

set -e

# ANSI Color Codes
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}   LRSYS HTTPS / SSL Auto-Configuration (Certbot + Let's Encrypt) ${NC}"
echo -e "${CYAN}================================================================${NC}"

# 1. Verify sudo/root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run with sudo: sudo bash deploy/setup-ssl.sh${NC}"
  exit 1
fi

# 2. Detect public IP
PUBLIC_IP=$(curl -s -4 icanhazip.com || curl -s -4 ifconfig.me || echo "")

# 3. Determine Domain
TARGET_DOMAIN="$1"

if [ -z "$TARGET_DOMAIN" ]; then
  echo -e ""
  echo -e "You can configure HTTPS using either:"
  echo -e "  1. A custom domain (e.g. ${YELLOW}cusdec.yourdomain.com${NC}) pointed to your static IP."
  if [ -n "$PUBLIC_IP" ]; then
    echo -e "  2. Instant Free Static IP Domain: ${YELLOW}${PUBLIC_IP}.sslip.io${NC} (No domain purchase needed!)"
  fi
  echo -e ""
  read -r -p "Enter your domain name [Press Enter to use ${PUBLIC_IP}.sslip.io]: " USER_INPUT_DOMAIN
  
  if [ -n "$USER_INPUT_DOMAIN" ]; then
    TARGET_DOMAIN="$USER_INPUT_DOMAIN"
  else
    if [ -n "$PUBLIC_IP" ]; then
      TARGET_DOMAIN="${PUBLIC_IP}.sslip.io"
    else
      echo -e "${RED}[ERROR] Could not detect public IP. Please specify a domain: sudo bash deploy/setup-ssl.sh yourdomain.com${NC}"
      exit 1
    fi
  fi
fi

# Clean whitespace
TARGET_DOMAIN=$(echo "$TARGET_DOMAIN" | xargs)

echo -e ""
echo -e "${GREEN}[1/4] Preparing SSL configuration for: ${YELLOW}${TARGET_DOMAIN}${NC}"

# 4. Ensure Certbot & Nginx are installed
if ! command -v certbot &> /dev/null; then
  echo -e "${GREEN}[2/4] Installing certbot and python3-certbot-nginx...${NC}"
  apt-get update -y
  apt-get install -y certbot python3-certbot-nginx
fi

# 5. Update Nginx configuration with server_name
echo -e "${GREEN}[3/4] Updating Nginx server_name in /etc/nginx/sites-available/lrsys...${NC}"
NGINX_CONF="/etc/nginx/sites-available/lrsys"

if [ -f "$NGINX_CONF" ]; then
  # Replace existing server_name
  sed -i "s/server_name .*/server_name ${TARGET_DOMAIN};/" "$NGINX_CONF"
else
  echo -e "${YELLOW}Warning: $NGINX_CONF not found, creating from project template...${NC}"
  cp deploy/nginx.conf "$NGINX_CONF"
  sed -i "s/server_name .*/server_name ${TARGET_DOMAIN};/" "$NGINX_CONF"
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/lrsys
  rm -f /etc/nginx/sites-enabled/default
fi

# Test Nginx syntax
nginx -t
systemctl reload nginx

# 6. Run Certbot to acquire SSL and configure HTTPS in Nginx
echo -e "${GREEN}[4/4] Requesting Let's Encrypt SSL certificate for ${TARGET_DOMAIN}...${NC}"

# Check if email is available or register without email
certbot --nginx -d "$TARGET_DOMAIN" \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect

# Reload Nginx with new certificate
systemctl reload nginx

echo -e ""
echo -e "${CYAN}================================================================${NC}"
echo -e "${GREEN}   HTTPS / SSL Successfully Configured!                       ${NC}"
echo -e "${CYAN}================================================================${NC}"
echo -e "Your terminal is now securely accessible at:"
echo -e "  ${YELLOW}https://${TARGET_DOMAIN}${NC}"
echo -e ""
echo -e "Certbot will automatically renew this certificate before it expires."
echo -e "${CYAN}================================================================${NC}"
