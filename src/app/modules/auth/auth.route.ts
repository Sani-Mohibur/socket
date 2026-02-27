import express from 'express';
import { AuthControllers } from './auth.controller';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../user/user.constant';
import { fileUploader } from '../../utils/fileUploader';

const router = express.Router();

router.post(
  '/register',
  fileUploader.upload.single('file'),
  AuthControllers.registerUser,
);
router.post('/login', AuthControllers.loginUser);
router.post('/refresh-token', AuthControllers.refreshToken);
router.post('/logout', AuthControllers.logoutUser);
router.post('/forgot-password', AuthControllers.forgotPassword);
router.post('/verify-otp', AuthControllers.verifyOtp);
router.post('/reset-password', AuthControllers.resetPassword);
router.post(
  '/change-password',
  auth(USER_ROLE.USER, USER_ROLE.ADMIN),
  AuthControllers.changePassword,
);

export const AuthRoutes = router;
