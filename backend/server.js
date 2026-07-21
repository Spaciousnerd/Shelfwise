import express from "express";
import cors from "cors";
import "dotenv/config";
import { connectDB } from "./config/db.js";
import errorHandler from "./middleware/errorHandler.js";
import authRouter from "./routes/authRoutes.js";
import studentRouter from "./routes/studentRoutes.js";
import bookRouter from "./routes/bookRoutes.js";

const PORT = process.env.PORT || 5000;
const app = express();

//middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "https://shelfwise-lib.onrender.com"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(errorHandler);

// DB
connectDB();
// routes
app.use("/api/auth", authRouter);
app.use("/api/students", studentRouter);
app.use("/api/books", bookRouter);

// test and listen
app.get("/", (req, res) => {
  res.send("Route wroking");
});
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
