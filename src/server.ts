import { createServer, Server as HttpServer } from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import { initSocket } from './app/modules/socket';

let server: HttpServer;

async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log('✅ Database connected successfully');

    const httpServer = createServer(app);

    initSocket(httpServer);

    server = httpServer.listen(config.port, () => {
      console.log(`🚀 Server is running on port ${config.port}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1); // Exit if DB fails on startup
  }
}

main();

process.on('unhandledRejection', (error) => {
  console.log('😈 unhandledRejection detected, shutting down...', error);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.log('😈 uncaughtException detected, shutting down...', error);
  process.exit(1);
});

// Added for Production Cloud Environments
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('🚫 Process terminated!');
    });
  }
});
