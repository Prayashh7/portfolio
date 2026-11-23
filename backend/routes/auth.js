import { Router } from "express";
import { login, logout, me } from "../controllers/auth.js";
import { requireAuth, requireCsrf } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/login", loginLimiter, login);
router.post("/logout", requireAuth, requireCsrf, logout);
router.get("/me", requireAuth, me);

export default router;
