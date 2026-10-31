import 'dotenv/config';
import { connectDB } from './src/config/databaseConfig.js';
import redisClient from './src/config/redis.js';
import { createServer } from 'http';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  await redisClient.connect();
  const { default: app } = await import('./app.js');
  const server = createServer(app);
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});