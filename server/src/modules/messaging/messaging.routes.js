import { Router } from "express";
import { messagingController } from "./messaging.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams, validateBody } from "../../middleware/validate.js";
import { sendMessageSchema, startConversationSchema } from "./messaging.schema.js";
import { z } from "zod";

const router = Router();
const convIdSchema = z.object({ conversationId: z.string().min(1) });

router.use(authenticate);

router.get(
  "/conversations",
  (req, res, next) => messagingController.getConversations(req, res, next)
);

router.get(
  "/conversations/:conversationId",
  validateParams(convIdSchema),
  (req, res, next) => messagingController.getMessages(req, res, next)
);

router.post(
  "/send",
  validateBody(sendMessageSchema),
  (req, res, next) => messagingController.sendMessage(req, res, next)
);

router.post(
  "/start",
  validateBody(startConversationSchema),
  (req, res, next) => messagingController.startConversation(req, res, next)
);

export default router;
