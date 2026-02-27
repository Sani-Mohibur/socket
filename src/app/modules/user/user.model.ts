import { Document, Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../../config';
import { IUser } from './user.interface';
import { USER_ROLE } from './user.constant';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: 0 },
    role: {
      type: String,
      enum: Object.values(USER_ROLE),
      default: USER_ROLE.USER,
    },
    profileImage: {
      url: { type: String },
      publicId: { type: String },
    },
    otp: { type: String, default: null, select: 0 },
    otpExpires: { type: Date, default: null, select: 0 },
  },
  {
    timestamps: true,
  },
);

// Password Hashing Middleware
userSchema.pre('save', async function (this: IUser & Document) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(
      this.password,
      Number(config.bcrypt_salt_rounds),
    );
  }
});

// Hide password in responses
userSchema.post('save', function (doc, next) {
  doc.password = '';
  next();
});

export const User = model<IUser>('User', userSchema);
