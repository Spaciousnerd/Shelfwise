import express from "express";
const bookRouter = express.Router();
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import {
  applyFine,
  clearFine,
  getFineSettings,
  getIssues,
  getStudentIssues,
  issueManualBooks,
  returnBook,
  updateFineSettings,
} from "../controllers/bookController.js";

bookRouter.get("/fine-settings", authenticateToken, getFineSettings);
bookRouter.get(
  "/issues/student",
  authenticateToken,
  authorizeRoles("user"),
  getStudentIssues,
);

// admin
bookRouter.get("/issues", authenticateToken,authorizeRoles("admin"), getIssues);
bookRouter.post(
  "/issue-manual",
  authenticateToken,
  authorizeRoles("admin"),
  issueManualBooks,
);
bookRouter.put(
  "/issues/:id/return",
  authenticateToken,
  authorizeRoles("admin"),
  returnBook,
);
bookRouter.put(
  "/issues/:id/fine",
  authenticateToken,
  authorizeRoles("admin"),
  applyFine,
);
bookRouter.put(
  "/issues/:id/clear-fine",
  authenticateToken,
  authorizeRoles("admin"),
  clearFine,
);
bookRouter.put(
  "/fine-settings",
  authenticateToken,
  authorizeRoles("admin"),
  updateFineSettings,
);

export default bookRouter;
