import express from 'express';
import { PrismaClient } from "../generated/prisma/client.js";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    try {
        const myTechnologies = await prisma.technology.findMany({
            where: {
                showInPortfolio: true
            },
            
            orderBy: {
                id: 'asc' 
            }
        });
        res.json(myTechnologies);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar 'minhas' tecnologias." });
    }
});

export default router;