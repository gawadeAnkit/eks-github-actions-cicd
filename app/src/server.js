const { createServer, setShuttingDown } = require('./app');

const PORT = process.env.PORT || 3000;
const server = createServer();

function logEvent(level, message, extra = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra
  }));
}

server.listen(PORT, () => {
  logEvent('INFO', 'Server started successfully', {
    port: Number(PORT),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Zero-downtime graceful shutdown for Kubernetes pod termination
const gracefulShutdown = (signal) => {
  logEvent('INFO', `Received ${signal}. Failing readiness probe and draining connections...`);
  setShuttingDown(true);

  server.close(() => {
    logEvent('INFO', 'All active HTTP connections closed. Exiting cleanly.');
    process.exit(0);
  });

  // Safety timeout before Kubernetes SIGKILL
  setTimeout(() => {
    logEvent('ERROR', 'Forced shutdown after drain timeout.');
    process.exit(1);
  }, 15000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
