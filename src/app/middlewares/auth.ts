import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../config';
import catchAsync from '../utils/catchAsync';
import AppError from '../errors/AppError';
import { jwtHelpers } from '../helpers/jwtHelpers';

declare global {
    namespace Express {
        interface Request {
            user: JwtPayload;
        }
    }
}

const auth = (...requiredRoles: string[]) => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;

        // 1. Check if token exists and follows 'Bearer <token>' format
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
        }

        // 2. Verify the token using your jwtHelper
        const decoded = jwtHelpers.verifyToken(
            token,
            config.jwt.access_secret as Secret,
        ) as JwtPayload;

        const { role } = decoded;

        // 3. Authorization check
        if (requiredRoles.length && !requiredRoles.includes(role)) {
            throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to access this resource');
        }

        // 4. Attach decoded payload to request
        req.user = decoded;
        next();
    });
};

export default auth;
