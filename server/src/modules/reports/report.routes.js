import { Router } from "express";
import { reportController } from "./report.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { createReportSchema } from "./report.schema.js";

const router = Router();

router.post(
  "/",
  authenticate,
  validateBody(createReportSchema),
  (req, res, next) => reportController.create(req, res, next)
);

export default router;
