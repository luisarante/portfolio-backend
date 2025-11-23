import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const allSkills = await prisma.technology.findMany(); 
    res.json(allSkills);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar habilidades" });
  }
});

export default router;