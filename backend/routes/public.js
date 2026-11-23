import { Router } from "express";
import * as publicController from "../controllers/public.js";
import { submitMessage } from "../controllers/contact.js";
import { contactLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.get("/health", publicController.getHealth);

/* One request for a first paint, then the same data per section for anything that
   needs to refetch. */
router.get("/portfolio", publicController.getPortfolio);

router.get("/profile", publicController.getProfile);
router.get("/settings", publicController.getSettings);
router.get("/skills", publicController.getSkills);

router.get("/projects", publicController.getCollection("projects"));
router.get("/projects/:slug", publicController.getProjectBySlug);

router.get("/services", publicController.getCollection("services"));
router.get("/experience", publicController.getCollection("experience"));
router.get("/education", publicController.getCollection("education"));
router.get("/achievements", publicController.getCollection("achievements"));
router.get("/certifications", publicController.getCollection("certifications"));
router.get("/social-links", publicController.getCollection("social-links"));

router.post("/contact", contactLimiter, submitMessage);

export default router;
