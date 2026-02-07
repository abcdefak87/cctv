# 🔐 Login Guide - RAF NET CCTV

## Admin Login

### Default Credentials

```
Username: admin
Password: admin123
```

⚠️ **IMPORTANT**: Change this password immediately in production!

## How to Login

### Via Web Interface

1. **Open Browser**: http://localhost:8090
2. **Click "Login" or "Admin"** button (usually in header/menu)
3. **Enter Credentials**:
   - Username: `admin`
   - Password: `admin123`
4. **Click "Login"**

### Via API (for testing)

```bash
curl -X POST http://localhost:8090/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

## Admin Features

After login, you can access:

- ✅ **Camera Management** - Add/Edit/Delete cameras
- ✅ **Area Management** - Organize cameras by location
- ✅ **User Management** - Create/manage admin users
- ✅ **Settings** - Configure system settings
- ✅ **Feedback** - View user feedback
- ✅ **Dashboard** - View statistics and analytics

## Change Password

### Via Web Interface

1. Login as admin
2. Go to **Settings** or **Profile**
3. Click **Change Password**
4. Enter old password: `admin123`
5. Enter new password
6. Save

### Via API

```bash
# Get token first (from login response)
TOKEN="your-jwt-token-here"

# Change password
curl -X POST http://localhost:8090/api/users/1/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "admin123",
    "new_password": "your-new-secure-password"
  }'
```

## Create Additional Admin Users

### Via Web Interface

1. Login as admin
2. Go to **User Management**
3. Click **Add User**
4. Fill in details:
   - Username
   - Email
   - Password
   - Role: Select "admin"
5. Save

### Via API

```bash
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:8090/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newadmin",
    "email": "admin@example.com",
    "password": "secure-password",
    "role": "admin"
  }'
```

## Reset Admin Password (if forgotten)

If you forget the admin password, you can reset it:

### Method 1: Using create_admin script

```bash
# Stop containers
docker compose down

# Run create_admin on host
cd backend
go run create_admin.go

# Start containers
docker compose up -d
```

This will recreate the admin user with default password `admin123`.

### Method 2: Direct database access

```bash
# Stop containers
docker compose down

# Install sqlite3 if not installed
sudo apt install sqlite3

# Open database
sqlite3 backend/data/cctv.db

# Delete old admin
DELETE FROM users WHERE username = 'admin';

# Exit sqlite3
.exit

# Run create_admin
cd backend
go run create_admin.go

# Start containers
docker compose up -d
```

## Troubleshooting

### Login Failed - Invalid Credentials

**Problem**: "Invalid username or password"

**Solutions**:
1. Check username is exactly `admin` (lowercase)
2. Check password is exactly `admin123`
3. Clear browser cache/cookies
4. Try incognito/private window

### Login Failed - Network Error

**Problem**: Cannot connect to API

**Solutions**:
1. Check if backend is running:
   ```bash
   docker compose ps
   curl http://localhost:8090/health
   ```

2. Check backend logs:
   ```bash
   docker compose logs cctv-app
   ```

3. Restart services:
   ```bash
   docker compose restart
   ```

### Token Expired

**Problem**: "Token expired" or "Unauthorized"

**Solution**: Login again to get a new token. Tokens expire after 24 hours.

### Cannot Access Admin Features

**Problem**: Logged in but cannot access admin pages

**Solutions**:
1. Check user role is "admin":
   ```bash
   # Via API
   curl http://localhost:8090/api/auth/verify \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. If role is not "admin", update via database or create new admin user

## Security Best Practices

1. ✅ **Change default password immediately**
2. ✅ **Use strong passwords** (min 12 characters, mixed case, numbers, symbols)
3. ✅ **Enable HTTPS** in production
4. ✅ **Limit admin access** to trusted IPs only
5. ✅ **Regular password rotation** (every 90 days)
6. ✅ **Enable 2FA** (if available in future updates)
7. ✅ **Monitor login attempts** via activity logs
8. ✅ **Use unique passwords** for each admin user

## API Endpoints Reference

### Authentication

```bash
# Login
POST /api/auth/login
Body: {"username": "admin", "password": "admin123"}

# Verify Token
GET /api/auth/verify
Header: Authorization: Bearer TOKEN

# Logout
POST /api/auth/logout
Header: Authorization: Bearer TOKEN
```

### User Management (Admin Only)

```bash
# List Users
GET /api/users
Header: Authorization: Bearer TOKEN

# Create User
POST /api/users
Header: Authorization: Bearer TOKEN
Body: {"username": "...", "password": "...", "role": "admin"}

# Change Password
POST /api/users/:id/change-password
Header: Authorization: Bearer TOKEN
Body: {"old_password": "...", "new_password": "..."}
```

## Support

If you still have issues:

1. Check [DOCKER_SETUP.md](DOCKER_SETUP.md) for Docker troubleshooting
2. Check backend logs: `docker compose logs cctv-app`
3. Check frontend console in browser (F12)
4. Open GitHub issue with error details

---

**Last Updated**: 2026-02-08  
**Default Credentials**: admin / admin123  
**⚠️ Change password in production!**
