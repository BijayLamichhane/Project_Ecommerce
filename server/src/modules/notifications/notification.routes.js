import { Router } from "express";
import { notificationController } from "./notification.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams } from "../../middleware/validate.js";
import { z } from "zod";

const router = Router();
const idSchema = z.object({ id: z.string().min(1) });

router.use(authenticate);

router.get("/", (req, res, next) => notificationController.getNotifications(req, res, next));

router.patch(
  "/:id/read",
  validateParams(idSchema),
  (req, res, next) => notificationController.markAsRead(req, res, next)
);

router.post(
  "/mark-all-read",
  (req, res, next) => notificationController.markAllAsRead(req, res, next)
);

export default router;
