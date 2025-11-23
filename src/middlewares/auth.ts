import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface UserPayload {
    id: number;
    email: string;
    role: 'ADMIN' | 'USER'; 
}

export interface AuthenticatedRequest extends Request {
    user?: UserPayload;
}

export function authenticateToken(
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: "Token não fornecido. Acesso não autorizado." });
    }

    try {
        const secret = process.env.JWT_SECRET;
        
        if (!secret) {
            console.error("JWT_SECRET não está definido nas variáveis de ambiente!");
            return res.status(500).json({ error: "Erro de configuração do servidor." });
        }

        const decoded = jwt.verify(token, secret) as UserPayload;
        
        req.user = decoded;
        
        next();

    } catch (err) {
        return res.status(403).json({ error: "Token inválido ou expirado." });
    }
}