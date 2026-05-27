import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { errorHandler } from "./middleware/errorHandler";
import appointmentRoutes from "./routes/appointments";
import authRoutes from "./routes/auth";
import doctorRoutes from "./routes/doctors";
import notificationRoutes from "./routes/notifications";
import patientRoutes from "./routes/patients";
import profileRoutes from "./routes/profile";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/doctors", doctorRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/notifications", notificationRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
