FROM nginx:stable-alpine

# Copy nginx configuration with environment variable handling
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy static files
COPY ./public /usr/share/nginx/html

# Set environment variables (this will be overridden by Cloud Run)
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start Nginx server
CMD sh -c "envsubst '\$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'" 