import { Router, Request, Response } from "express";
import prisma from "../prisma.js"; 
import { authenticateToken } from '../middlewares/auth.js'; 
import { requireAdmin } from "../middlewares/authorization.js";


const router = Router();

router.post("/", async (req: Request, res: Response) => {
    interface ContatoBody {
        nome: string;
        email: string;
        mensagem: string;
    }
    
    const { nome, email, mensagem } = req.body as ContatoBody;

    if (!nome || !email || !mensagem) {
        return res.status(400).json({ error: "Nome, e-mail e mensagem são obrigatórios." });
    }

    try {
        const novaMensagem = await prisma.mensagemContato.create({
            data: {
                nome,
                email,
                mensagem,
            },
        });
        
        res.status(201).json({ 
            message: "Mensagem enviada com sucesso!", 
            data: novaMensagem 
        });

    } catch (err) {
        console.error("Erro ao salvar mensagem de contato:", err);
        res.status(500).json({ error: "Erro interno ao processar a mensagem." });
    }
});

router.get("/", authenticateToken, requireAdmin, async (req: Request, res: Response) => {


    try {
        const todasMensagens = await prisma.mensagemContato.findMany({
            orderBy: {
                enviadaEm: 'desc',
            },
        });

        res.json(todasMensagens);
    } catch (err) {
        console.error("Erro ao buscar mensagens de contato:", err);
        res.status(500).json({ error: "Erro ao buscar mensagens do dashboard" });
    }
});

router.patch("/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const messageId = parseInt(req.params.id, 10);
    
    const { lida } = req.body as { lida: boolean };

    if (isNaN(messageId)) {
        return res.status(400).json({ error: "ID de mensagem inválido." });
    }
    
    if (typeof lida !== 'boolean') {
        return res.status(400).json({ error: "O campo 'lida' é obrigatório e deve ser booleano." });
    }

    try {
        const mensagemAtualizada = await prisma.mensagemContato.update({
            where: {
                id: messageId,
            },
            data: {
                lida: lida, 
            },
        });
        
        res.json(mensagemAtualizada);

    } catch (err: any) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: `Mensagem com ID ${messageId} não encontrada.` });
        }
        
        console.error("Erro ao atualizar status da mensagem:", err);
        res.status(500).json({ error: "Erro interno ao atualizar a mensagem." });
    }
});

export default router;