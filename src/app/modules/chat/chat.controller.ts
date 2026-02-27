import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { fileUploader } from '../../utils/fileUploader';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

const uploadChatImages = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please upload at least one file',
    );
  }

  const uploadPromises = files.map((file) =>
    fileUploader.uploadToCloudinary(file),
  );
  const results = await Promise.all(uploadPromises);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Files uploaded successfully',
    data: results,
  });
});

export const ChatController = { uploadChatImages };
