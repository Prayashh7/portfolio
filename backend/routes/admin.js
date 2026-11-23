import { Router } from "express";
import * as admin from "../controllers/admin.js";
import { listMedia, receiveFile, removeUpload, saveUpload } from "../controllers/uploads.js";
import { requireAuth, requireCsrf } from "../middleware/auth.js";
import { resourceKeys } from "../db/resources.js";

/*
  Everything in this router is behind the two lines below. There is one protection
  boundary for the whole write surface rather than a guard per route, so nothing
  can be added later and accidentally left public.
*/

const router = Router();

router.use(requireAuth);
router.use(requireCsrf);

router.get("/overview", admin.getOverview);

router.get("/profile", admin.getSingleton("profile"));
router.put("/profile", admin.patchSingleton("profile"));

router.get("/settings", admin.getSingleton("settings"));
router.put("/settings", admin.patchSingleton("settings"));

/* The nine collections behave identically, so they are mounted in a loop from the
   same config the validators come from. */
for (const key of resourceKeys) {
  router
    .route(`/${key}`)
    .get(admin.listAll(key))
    .post(admin.create(key));

  router
    .route(`/${key}/:id`)
    .get(admin.getOne(key))
    .put(admin.update(key))
    .delete(admin.remove(key));
}

router.get("/projects/:id/images", admin.listProjectImages);
router.post("/projects/:id/images", admin.addProjectImage);
router.put("/project-images/:imageId", admin.updateProjectImage);
router.delete("/project-images/:imageId", admin.removeProjectImage);

router.get("/messages", admin.listMessages);
router.patch("/messages/:id", admin.setMessageRead);
router.delete("/messages/:id", admin.removeMessage);

router.get("/media", listMedia);
router.post("/uploads", receiveFile, saveUpload);
router.delete("/uploads/:filename", removeUpload);

export default router;
