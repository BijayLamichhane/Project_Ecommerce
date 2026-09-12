import { Router } from "express";
import { cartController } from "./cart.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import { addToCartSchema, updateCartItemSchema } from "./cart.schema.js";
import { z } from "zod";

const router = Router();
const idSchema = z.object({ id: z.string() });

router.use(authenticate);

router.get("/", (req, res, next) => cartController.getCart(req, res, next));

router.post(
  "/",
  validateBody(addToCartSchema),
  (req, res, next) => cartController.addItem(req, res, next)
);

router.patch(
  "/:id",
  validateParams(idSchema),
  validateBody(updateCartItemSchema),
  (req, res, next) => cartController.updateItem(req, res, next)
);

router.delete(
  "/:id",
  validateParams(idSchema),
  (req, res, next) => cartController.removeItem(req, res, next)
);

router.delete("/", (req, res, next) => cartController.clearCart(req, res, next));

export default router;
