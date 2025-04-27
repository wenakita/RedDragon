FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --only=production

# Copy application source
COPY . .

# Expose port
EXPOSE 8080

# Start the app
CMD ["node", "server.js"] 