import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../prisma.js"; 
import { UserPayload } from "../middlewares/auth.js"; 

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_segura';

router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, passwordHash: true, role: true }
        });

        if (!user || !user.passwordHash) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        const payload: UserPayload = {
            id: user.id,
            email: user.email,
            role: user.role as 'ADMIN' | 'USER' 
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        res.json({ token, user: payload });

    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

export default router;