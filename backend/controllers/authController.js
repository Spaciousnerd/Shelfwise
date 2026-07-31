import User from "../models/User.js";
import { generate } from "otp-generator";
import asyncHandler from "../utils/asyncHandler.js";
import sendOTP from "../utils/sendOTP.js";
import bcrypt, { hash } from "bcryptjs";
import AppError from "../utils/AppError.js";
import { v4 as uuid } from "uuid";
import jwt from "jsonwebtoken";
// registration and send otp
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!email) throw new AppError("Email is required", 400);
  if (!password) throw new AppError("Password is required", 400);
  const cleanPhone = phone ? phone.toString().replace(/\D/g, "") : "";
  if (cleanPhone.length !== 10) throw new AppError("Phone number invalid", 400);
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser?.isVerified) {
    throw new AppError("User already exists", 409);
  }
  const otp = generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
  const hashedPassword = await bcrypt.hash(password, 10);
  const otpExpiary = new Date(Date.now() + 5 * 60 * 1000);
  await sendOTP(email, otp);
  if (existingUser) {
    existingUser.name = name;
    existingUser.phone = cleanPhone;
    existingUser.password = hashedPassword;
    existingUser.otp = otp;
    existingUser.otpExpiary = otpExpiary;
    await existingUser.save();
  } else {
    await User.create({
      name,
      email,
      phone: cleanPhone,
      password: hashedPassword,
      otp,
      otpExpiary,
      studentId: `ST-${uuid().slice(0, 8).toUpperCase()}`,
    });
  }
  return res.status(201).json({
    success: true,
    message: existingUser
      ? "OTP sent to email."
      : "User registered successfully. OTP sent to your email.",
  });
});

// verify otp
export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email) throw new AppError("Email is required", 400);
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw new AppError("User Not Found", 404);
  console.log({
    receivedOtp: otp,
    storedOtp: user.otp,
    receivedType: typeof otp,
    storedType: typeof user.otp,
  });
  if (user.otp !== otp || new Date() > new Date(user.otpExpiary))
    throw new AppError("Invalid or Expired otp", 400);
  Object.assign(user, { isVerified: true, otp: null, otpExpiary: null });
  await user.save();
  return res.status(200).json({
    success: true,
    message: "OTP verified",
  });
});
// complete profile
export const completeProfile = asyncHandler(async (req, res) => {
  const { email, department, stream, semester, year, rollNo } = req.body;
  if (!email) throw new AppError("Email not registered", 400);
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw new AppError("User not found", 404);
  Object.assign(user, {
    department: department,
    stream: stream,
    semester: semester,
    year: year,
    rollNo: rollNo,
    isProfileComplete: true,
  });
  await user.save();
  return res.status(200).json({
    success: true,
    message: "Profile Complete",
  });
});
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError("Invalid Credentials", 401);
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw new AppError("User Not Found", 404);
  if (!user.isVerified)
    throw new AppError("Please verify your otp before logging in", 400);
  if (!bcrypt.compare(password, user.password))
    throw new AppError("Incorrect Email or Password", 400);
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
  const { password: _, ...userResponse } = user.toObject();
  return res.status(200).json({
    success: true,
    token,
    user: userResponse,
  });
});
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) throw new AppError("User does not exist", 404);
  return res.status(200).json({
    success: true,
    message: "User found",
    user: user,
  });
});

// update profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, department, stream, semester, year, rollNumber } =
    req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError("User not found", 404);
  // Email update
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== user.email.toLowerCase() && user.role === "user")
      throw new AppError("Students are not allowed to change their email", 400);
    if (
      normalizedEmail !== user.email.toLowerCase() &&
      (await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      }))
    ) {
      throw new AppError("Email already in use", 409);
    }
    user.email = normalizedEmail;
  }
  // Phone update
  if (phone) {
    const cleanPhone = phone.toString().replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      throw new AppError("Phone number invalid", 400);
    }
    user.phone = cleanPhone;
  }
  // Other fields
  if (name) user.name = name;
  if (department) user.department = department;
  if (stream) user.stream = stream;
  if (semester) user.semester = semester;
  if (year) user.year = year;
  if (rollNumber) user.rollNo = rollNumber;
  await user.save();
  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
  });
});
// export all user data!=admin
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({
    role: "user",
    isVerified: true,
    isProfileComplete: true,
  }).select("-password");
  res.status(200).json({
    success: true,
    message: "Fetched user data successfully",
    users,
  });
});
// for admin registration
export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  // console.log({
  //   name,
  //   email,
  //   phone,
  //   password,
  // });
  if (!email || !name || !phone || !password)
    throw new AppError("Incomplete request", 400);
  if (await User.findOne({ email }))
    throw new AppError("Email already registered", 400);
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.trim().toLowerCase(),
    phone,
    password: hashedPassword,
    role: "admin",
    isVerified: "true",
  });
  const { password: _, ...userResponse } = user.toObject();
  res.status(200).json({
    success: true,
    message: "Admin registered successfully",
    user: userResponse,
  });
});
