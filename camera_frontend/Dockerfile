# Use official Node image
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json /app/
RUN npm install

# Copy all your React code
COPY . /app/

# Expose Vite's port
EXPOSE 5173

# Start Vite
CMD ["npm", "run", "dev", "--", "--host"]
