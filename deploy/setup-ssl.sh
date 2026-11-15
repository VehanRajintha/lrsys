#!/usr/bin/env bash
# ==============================================================================
# LRSYS - Automated HTTPS / SSL Setup Script (Let's Encrypt + Certbot)
# Usage:
#   sudo bash deploy/setup-ssl.sh [optional_domain]
#
# Examples:
#   sudo bash deploy/setup-ssl.sh cusdec.yourdomain.com
#   sudo bash deploy/setup-ssl.sh
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

# 2. Reliably detect public IP (Checking AWS Metadata first, then fallback services)
PUBLIC_IP=$(curl -s --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)
if [ -z "$PUBLIC_IP" ]; then
  PUBLIC_IP=$(curl -s -4 --max-time 3 icanhazip.com 2>/dev/null || curl -s -4 --max-time 3 ifconfig.me 2>/dev/null || curl -s -4 --max-time 3 api.ipify.org 2>/dev/null || echo "")
fi

# 3. Determine Domain
TARGET_DOMAIN="$1"

if [ -z "$TARGET_DOMAIN" ]; then
  echo -e ""
  echo -e "Choose how you want to configure HTTPS:"
  echo -e "  [1] Custom domain (e.g. ${YELLOW}cusdec.yourdomain.com${NC}) pointed to your static IP."
  if [ -n "$PUBLIC_IP" ]; then
    echo -e "  [2] Instant Free Static IP Domain: ${YELLOW}${PUBLIC_IP}.sslip.io${NC} (No domain purchase needed!)"
  fi
  echo -e ""
  read -r -p "Enter choice [1 or 2] or type your domain name: " USER_INPUT_DOMAIN
  
  USER_INPUT_DOMAIN=$(echo "$USER_INPUT_DOMAIN" | xargs)

  # If user typed '2' or left it blank
  if [ "$USER_INPUT_DOMAIN" = "2" ] || [ -z "$USER_INPUT_DOMAIN" ]; then
    if [ -n "$PUBLIC_IP" ]; then
      TARGET_DOMAIN="${PUBLIC_IP}.sslip.io"
    else
      echo -e "${RED}[ERROR] Could not detect public IP. Please specify a domain name.${NC}"
      exit 1
    fi
  elif [ "$USER_INPUT_DOMAIN" = "1" ]; then
    read -r -p "Please enter your custom domain name (e.g. cusdec.yourdomain.com): " CUSTOM_DOMAIN
    TARGET_DOMAIN=$(echo "$CUSTOM_DOMAIN" | xargs)
  else
    # User typed a domain name directly
    TARGET_DOMAIN="$USER_INPUT_DOMAIN"
  fi
fi

# Clean whitespace
TARGET_DOMAIN=$(echo "$TARGET_DOMAIN" | xargs)

# Validation: Domain must contain at least one dot
if [[ "$TARGET_DOMAIN" != *"."* ]]; then
  echo -e "${RED}[ERROR] '$TARGET_DOMAIN' is not a valid domain name (must contain a dot, e.g. domain.com).${NC}"
  if [ -n "$PUBLIC_IP" ]; then
    echo -e "${YELLOW}Falling back to your Free Static IP Domain: ${PUBLIC_IP}.sslip.io${NC}"
    TARGET_DOMAIN="${PUBLIC_IP}.sslip.io"
  else
    exit 1
  fi
fi

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
