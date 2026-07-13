# === STAGE 1: Build the React Application ===
FROM node:20-slim AS builder

WORKDIR /app

# Copy package configurations and install ALL dependencies (including devDependencies like Vite)
COPY package*.json ./
RUN npm install

# Copy the rest of your React app source code
COPY . .

# Build the optimized production static files (usually outputs to a /dist folder)
RUN npm run build

# === STAGE 2: Serve the Static Files with Nginx ===
FROM nginx:alpine

# Copy the compiled static production files from Stage 1 into Nginx's public folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (Standard port for Nginx web traffic)
EXPOSE 80

# Run Nginx in the foreground so the container stays active
CMD ["nginx", "-g", "daemon off;"]
