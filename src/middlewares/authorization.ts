import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js'; 

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: "Acesso proibido. Apenas administradores podem acessar esta rota." });
    }
    
    next();
}