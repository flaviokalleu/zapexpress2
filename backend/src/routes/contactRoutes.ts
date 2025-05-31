import { Router } from "express";
import isAuth from "../middlewares/isAuth";
import multer from "multer";
import uploadConfig from "../config/upload";
import * as ContactController from "../controllers/ContactController";

const contactRoutes = Router();
const upload = multer(uploadConfig);

contactRoutes.post(
  "/contacts/import",
  isAuth,
  upload.array("file"),
  ContactController.upload
);

contactRoutes.get("/contacts", isAuth, ContactController.index);

contactRoutes.get("/contacts/list", isAuth, ContactController.list);

contactRoutes.get("/contacts/:contactId", isAuth, ContactController.show);

contactRoutes.post("/contacts", isAuth, ContactController.store);

contactRoutes.put("/contacts/:contactId", isAuth, ContactController.update);

contactRoutes.delete("/contacts/:contactId", isAuth, ContactController.remove);

contactRoutes.get("/contact", isAuth, ContactController.getContactVcard);

export default contactRoutes;
