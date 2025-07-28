import express from "express";
import isAuth from "../middleware/isAuth";

import * as GroupController from "../controllers/GroupController";

const groupRoutes = express.Router();

groupRoutes.get("/groups", isAuth, GroupController.index);

groupRoutes.post("/groups", isAuth, GroupController.store);

groupRoutes.put("/groups/:id", isAuth, GroupController.update);

groupRoutes.delete("/groups/:id", isAuth, GroupController.remove);

export default groupRoutes; 