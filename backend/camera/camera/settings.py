import os # Add this at the top with your other imports

# ... (keep your SECRET_KEY and DEBUG settings)

ALLOWED_HOSTS = ["*"] # Allows connection during local development

# 1. Add DRF and CORS to Installed Apps
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",      # Required for API
    "corsheaders",         # Required for React communication
]

# 2. Add CorsMiddleware at the TOP of Middleware
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware", # Must be at the top
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# 3. Allow your React Frontend to talk to Django
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000", # Default React port
]

# ... (keep ROOT_URLCONF, TEMPLATES, DATABASES, etc.)

# 4. Static and Media Files Configuration
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# This is where your uploaded camera photos will be saved
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
