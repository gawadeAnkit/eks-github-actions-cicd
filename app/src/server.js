const { createServer } = require('./app');

const PORT = process.env.PORT || 3000;
const server = createServer();

server.listen(PORT, () => {
  console.log(`[INFO] Server running on port ${PORT} in ${process.env.NODE_ENV || 'production'} mode`);
});

// Graceful shutdown handling for Kubernetes pod termination (SIGTERM / SIGINT)
const gracefulShutdown = (signal) => {
  console.log(`[INFO] Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    console.log('[INFO] Closed all active HTTP connections. Pod exiting cleanly.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[ERROR] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
