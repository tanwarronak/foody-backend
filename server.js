import app from './app.js';
import { connectDB } from './src/config/databaseConfig.js';
import { createServer } from 'http';

const server =  createServer(app);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exitCode = 1;
  }
};

startServer();