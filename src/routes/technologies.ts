import { Router, Request, Response } from "express";
import prisma from "../prisma.js";
import { authenticateToken } from '../middlewares/auth.js'; 
import { requireAdmin } from '../middlewares/authorization.js'; 

const router = Router();

router.post("/", 
    authenticateToken, 
    requireAdmin,
    async (req: Request, res: Response) => {
        
        const { name, category, icon, color } = req.body;

        if (!name || !category) {
            return res.status(400).json({ error: "O nome e a categoria são obrigatórios." });
        }

        try {
            const existingTechnology = await prisma.technology.findUnique({
                where: { name: name },
            });

            if (existingTechnology) {
                return res.status(409).json({ error: `A tecnologia '${name}' já existe.` });
            }

            const newTechnology = await prisma.technology.create({
                data: {
                    name,
                    category,
                    icon: icon || null,
                    color: color || null,
                    showInPortfolio: true, 
                },
            });

            res.status(201).json(newTechnology);

        } catch (err) {
            console.error("Erro ao cadastrar tecnologia:", err);
            res.status(500).json({ error: "Erro interno ao cadastrar a tecnologia." });
        }
    }
);


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