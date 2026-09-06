import express from "express";
import { isAuthenticated } from "../middlewares/protectionMiddleware.js";
import { orderWebhook, verifyOrder, getPaymentHistory } from "../controllers/paymentController.js";

const router = express.Router();
 
router.post("/verifyorder/",isAuthenticated, verifyOrder); //tested
router.post("/verifyorder/webhook", isAuthenticated, orderWebhook); // not tested
router.get("/paymenthistory/:order_id",isAuthenticated, getPaymentHistory); // tested


export default router;