import { Router } from "express";
import { price, fees } from "../controllers/marketController.js";

const r = Router();
r.get("/price", price);
r.get("/fees", fees);
export default r;
