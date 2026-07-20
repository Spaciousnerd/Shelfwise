import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
export const searchStudentsByRoll = asyncHandler(async (req, res) => {
  const roll = String(req.query.roll || "").trim();
  if (!roll) return res.status(200).json({ success: true, students: [] });
  const escaped = roll.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rollRegex = new RegExp(escaped, "i");
  const students = await User.find({
    role: "user",
    isProfileComplete: true,
    rollNo: { $regex: rollRegex },
  })
    .select("name email department stream semester year rollNo")
    .limit(12);
  const mappedStudents = students.map((student) => ({
    name: student.name,
    email: student.email,
    department: student.department || "",
    stream: student.stream || "",
    academicYear: student.year || "",
    semester: student.semester || "",
    rollNo: student.rollNo || "",
  }));
  res.status(200).json({
    success: true,
    students: mappedStudents,
  });
});
