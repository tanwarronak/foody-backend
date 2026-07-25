import express from 'express';
import dotenv from 'dotenv';
import {connectDB} from './src/config/databaseConfig.js';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import setupGoogleAuth from './src/utils/googleAuth.js';
import rateLimit from 'express-rate-limit';

const config = dotenv.config();

const app = express();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use(limiter);

setupGoogleAuth();

// middlewares
app.use(cors({ origin: "*" })); //change it later to allow only specific origins
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


// connect to db
connectDB();


// import routes
import userRoute from './src/routes/userRoute.js';
import restaurantRoute from './src/routes/restaurantRoute.js';
import menuRoute from './src/routes/menuRoute.js';
import cartRoute from './src/routes/cartRoute.js';
import orderRoute from './src/routes/orderRoute.js';
import paymentRoute from './src/routes/paymentRoute.js';

// use routes
app.use('/api/users', userRoute); // tested
app.use('/api/restaurants', restaurantRoute); // tested
app.use('/api/menuitems', menuRoute); // tested
app.use('/api/carts', cartRoute); //tested
app.use('/api/orders', orderRoute);
app.use('/api/payments', paymentRoute);

export default app;