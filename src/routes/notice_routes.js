import { Router } from "express";
import { NoticeController } from "../controllers/notice_controller.js";

const router = Router();

router.get("/", NoticeController.getAllNotices);
router.get("/:id", NoticeController.getNoticeById);
router.post("/", NoticeController.createNotice);
router.put("/:id", NoticeController.updateNotice);
router.delete("/:id", NoticeController.deleteNotice);

export default router;
