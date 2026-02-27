import express from 'express';
import { ChatController } from './chat.controller';
import { fileUploader } from '../../utils/fileUploader';
import auth from '../../middlewares/auth';

const router = express.Router();

router.post(
  '/upload-images',
  auth(),
  fileUploader.upload.array('files', 5),
  ChatController.uploadChatImages,
);

export const ChatRoutes = router;
