import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    database_url: process.env.MONGO_URI,
    bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
    jwt: {
        secret: process.env.JWT_SECRET,
        expires_in: process.env.JWT_EXPIRE,
        access_secret: process.env.ACCESS_TOKEN_SECRET,
        access_expires_in: process.env.ACCESS_TOKEN_EXPIRES,
        refresh_secret: process.env.REFRESH_TOKEN_SECRET,
        refresh_expires_in: process.env.REFRESH_TOKEN_EXPIRES,
    },
    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    },
    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM,
        admin: process.env.ADMIN_EMAIL,
        expires: process.env.EMAIL_EXPIRES,
    },
    stripe: {
        secret_key: process.env.STRIPE_SECRET_KEY,
        webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    urls: {
        frontend: process.env.FRONTEND_URL,
        backend: process.env.BACKEND_URL,
    },
    google: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        android_client_id: process.env.GOOGLE_ANDROID_CLIENT_ID,
        ios_client_id: process.env.GOOGLE_IOS_CLIENT_ID,
    },
    rate_limit: {
        window: process.env.RATE_LIMIT_WINDOW,
        max: process.env.RATE_LIMIT_MAX,
    },
};