import express from "express";
import isAuth from "../middleware/isAuth";

import * as SubscriptionController from "../controllers/SubscriptionController";

import { checkWebhook } from "../controllers/SubscriptionController";


const subscriptionRoutes = express.Router();
subscriptionRoutes.post("/subscription", isAuth, SubscriptionController.createSubscription);
subscriptionRoutes.post("/subscription/create/webhook", SubscriptionController.createWebhook);
subscriptionRoutes.post("/subscription/webhook/:type?", SubscriptionController.webhook);

subscriptionRoutes.get("/subscription/check-webhook", checkWebhook);


export default subscriptionRoutes;
