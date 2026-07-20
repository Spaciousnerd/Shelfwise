import { createTransport } from "nodemailer";
import asyncHandler from "./asyncHandler.js";
const sendOTP = asyncHandler(async (email, otp) => {
  const transporter = createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "OTP from GO-Lib",
    html: `<h2>Your OTP is ${otp}</h2>`,
  });
});
export default sendOTP;
