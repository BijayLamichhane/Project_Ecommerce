import { Router } from "express";
import { wishlistController } from "./wishlist.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import { z } from "zod";

const router = Router();
const toggleSchema = z.object({ productId: z.string().min(1) });
const paramSchema = z.object({ productId: z.string().min(1) });

router.use(authenticate);

router.get("/", (req, res, next) => wishlistController.getWishlist(req, res, next));

router.post(
  "/toggle",
  validateBody(toggleSchema),
  (req, res, next) => wishlistController.toggleWishlist(req, res, next)
);

router.get(
  "/check/:productId",
  validateParams(paramSchema),
  (req, res, next) => wishlistController.checkStatus(req, res, next)
);

export default router;
