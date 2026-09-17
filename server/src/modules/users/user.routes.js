import { Router } from "express";
import { userController } from "./user.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireSeller } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { updateProfileSchema, sellerOnboardingSchema, updateSellerSettingsSchema } from "./user.schema.js";

const router = Router();

router.use(authenticate);

router.get("/me", (req, res, next) => userController.getMe(req, res, next));

router.patch(
  "/profile",
  validateBody(updateProfileSchema),
  (req, res, next) => userController.updateProfile(req, res, next)
);

router.post(
  "/become-seller",
  validateBody(sellerOnboardingSchema),
  (req, res, next) => userController.registerAsSeller(req, res, next)
);

router.post(
  "/seller/disband",
  requireSeller,
  (req, res, next) => userController.disbandSeller(req, res, next)
);

router.post(
  "/seller/disband-request",
  requireSeller,
  (req, res, next) => userController.disbandSeller(req, res, next)
);

router.patch(
  "/seller/settings",
  requireSeller,
  validateBody(updateSellerSettingsSchema),
  (req, res, next) => userController.updateSellerSettings(req, res, next)
);

router.get(
  "/seller/earnings",
  requireSeller,
  (req, res, next) => userController.getSellerEarnings(req, res, next)
);

router.get(
  "/customer/stats",
  (req, res, next) => userController.getCustomerStats(req, res, next)
);

export default router;
