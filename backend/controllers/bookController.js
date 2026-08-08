import Issue from "../models/issue.js";
import User from "../models/User.js";
import FineSetting from "../models/FineSetting.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { set } from "mongoose";
const getLocalIsoDate = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getStartOfDay = (value) => new Date(new Date(value).setHours(0, 0, 0, 0));

const getDiffInDays = (targetDateString) =>
  Math.round(
    (getStartOfDay(targetDateString) - getStartOfDay(new Date())) / 86400000,
  );

const getOverdueUnits = (overdueDays, interval) => {
  if (overdueDays <= 0) return 0;
  const divisor = { week: 7, month: 30, year: 365 }[interval] || 1;
  return Math.ceil(overdueDays / divisor);
};

const calculateFine = (issue, fineRate = 10, fineInterval = "day") => {
  if (!issue || issue.fineCleared || issue.returnedOn) return 0;
  const overdueDays = Math.max(0, -getDiffInDays(issue.dueDate));
  return (
    getOverdueUnits(overdueDays, fineInterval) * fineRate +
    (Number(issue.manualFine) || 0)
  );
};
export const issueManualBooks = asyncHandler(async (req, res) => {
  const { studentDetails, books } = req.body;
  console.log(studentDetails, books);
  if (!Array.isArray(books) || books.length === 0)
    throw AppError("No books requested", 400);
  const student = await User.findOne({ rollNo: studentDetails.rollNumber });
  if (!student) throw new AppError("Student not found!", 404);
  const todayIso = getLocalIsoDate();
  const validBooks = books.filter((b) => b.title && b.bookCode && b.dueDate);
  if (validBooks.length === 0)
    throw new AppError(
      "Please Add atleast 1 manual book entry with book code and a due date ",
      400,
    );
  const createdIssues = await Promise.all(
    validBooks.map((book) =>
      Issue.create({
        source: "manual",
        bookCode: book.bookCode.trim(),
        title: book.title.trim(),
        userEmail: student.email,
        userName: student.name,
        issuedOn: todayIso,
        dueDate: book.dueDate,
        returnedOn: null,
        fineRate: Number(book.fineRate ?? req.body.fineRate ?? 10),
        fineInterval: book.fineInterval ?? req.body.fineInterval ?? "day",
        manualFine: 0,
        fineCleared: false,
        clearedFineAmount: 0,
        department:
          studentDetails.department?.trim() || student.department || "General",
        stream: studentDetails.stream?.trim() || student.stream || "General",
        year: studentDetails.academicYear?.trim() || student.year || "1st Year",
        semester:
          studentDetails.semester?.trim() || student.semester || "Semester 1",
        rollNumber:
          studentDetails.rollNumber?.trim() || student.rollNo || "Not assigned",
        studentId: student.rollNo || `ST-${student._id.toString().slice(-4)}`,
      }),
    ),
  );
  res.status(201).json({
    success: true,
    message: `${createdIssues.length} manual books issued successfully`,
    count: createdIssues.length,
    issues: createdIssues,
  });
});
// get all issues (accessible only to admin)
export const getIssues = asyncHandler(async (req, res) => {
  const issues = await Issue.find({}).sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    issues,
  });
});
// get manual issuess for logged in studnets
export const getStudentIssues = asyncHandler(async (req, res) => {
  const issues = await Issue.find({
    userEmail: req.user.email.toLowerCase().trim(),
  })?.sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    issues,
  });
});
// return issued manual books
export const returnBook = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new AppError("Issue not found", 404);
  if (issue.returnedOn) throw new AppError("Book already returned", 400);
  issue.returnedOn = getLocalIsoDate();
  await issue.save();
  return res.status(200).json({
    success: true,
    message: "Book returned successfully",
  });
});
// apply manual fine
export const applyFine = asyncHandler(async (req, res) => {
  const fineAmount = Number(req.body.amount);
  if (Number.isNaN(fineAmount)) throw new AppError("Invalid fine", 400);
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new AppError("Issue not found", 404);
  issue.manualFine = fineAmount;
  if (fineAmount > 0) issue.fineCleared = false;
  await issue.save();
  return res.status(200).json({
    success: true,
    message: "Manual fine appliead successfully",
  });
});
// clear manual fine
export const clearFine = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new AppError("Issue not found", 404);
  Object.assign(issue, {
    manualFine: 0,
    fineCleared: true,
    clearedFineAmount: calculateFine(issue, issue.fineRate, issue.fineInterval),
  });
  await issue.save();9
  res.status(200).json({
    success: true,
    message: "Fine cleared",
    issue,
  });
});
// get active fine settings
export const getFineSettings = asyncHandler(async (req, res) => {
  const settings =
    (await FineSetting.findOne({})) ||
    (await FineSetting.create({
      amount: 10,
      interval: "day",
    }));
  res.status(200).json({
    success: true,
    settings,
  });
});
// update fine settings
export const updateFineSettings = asyncHandler(async (req, res) => {
  const { amount, interval } = req.body;
  let settings = await FineSetting.findOne({});
  if (settings) {
    if (amount !== undefined) settings.amount = Number(amount);
    if (interval != undefined) settings.interval = interval;
  } else {
    settings = await FineSetting.create({
      amount: Number(amount),
      interval: interval || "day",
    });
  }
  res.status(200).json({
    success: true,
    message: "Fine Settings Updated",
    settings,
  });
});
