import { Router } from "express";
import { dbStatus } from "../config/db.js";

const r = Router();
r.get("/", (req, res) => res.json({ status: "ok", db: dbStatus(), time: new Date().toISOString() }));
export default r;
