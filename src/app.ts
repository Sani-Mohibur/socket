import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import config from './app/config';
import notFound from './app/middlewares/notFound';
import router from './app/routes';

const app: Application = express();

// 1. Security & Performance
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));

// 2. Rate Limiting (Using Config)
const limiter = rateLimit({
  windowMs: Number(config.rate_limit.window) || 15 * 60 * 1000,
  max: Number(config.rate_limit.max) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});

app.use('/api/v1', limiter);

// 3. Essential Middlewares
app.use(cors({ origin: '*', credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. Routes
app.use('/api/v1', router);

app.get('/', (req: Request, res: Response) => {
  res.status(200).send('<h1>API is running successfully</h1>');
});

// 5. Error Handling
app.use(notFound);
app.use(globalErrorHandler);

export default app;
