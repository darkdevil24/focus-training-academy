import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../services/auth-service';
import { logger } from '../utils/logger';
import { JWTPayload } from '../types/auth';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Middleware to authenticate JWT tokens from Authorization header.
 * Validates token, checks user session, and attaches user to request.
 * 
 * @param req - Express request object (extended with user property)
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * ```typescript
 * import { authenticateToken } from './middleware/auth-middleware';
 * 
 * router.get('/protected', authenticateToken, (req, res) => {
 *   res.json({ user: req.user });
 * });
 * ```
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JWTPayload;
    const userSession = await authService.validateToken(decoded);

    if (!userSession) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = userSession;
    next();
  } catch (error) {
    logger.error('Token authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware factory that creates role-based access control middleware.
 * Checks if authenticated user has any of the required roles.
 * 
 * @param roles - Array of required role names
 * @returns {Function} Express middleware function
 * 
 * @example
 * ```typescript
 * import { requireRole } from './middleware/auth-middleware';
 * 
 * router.post('/admin', authenticateToken, requireRole(['admin']), (req, res) => {
 *   res.json({ message: 'Admin access granted' });
 * });
 * ```
 */
export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: userRoles
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory that creates permission-based access control middleware.
 * Checks if authenticated user has specific resource and action permissions.
 * 
 * @param resource - Resource name (e.g., 'users', 'challenges')
 * @param action - Action name (e.g., 'read', 'write', 'delete')
 * @returns {Function} Express middleware function
 * 
 * @example
 * ```typescript
 * import { requirePermission } from './middleware/auth-middleware';
 * 
 * router.delete('/users/:id', 
 *   authenticateToken, 
 *   requirePermission('users', 'delete'), 
 *   (req, res) => {
 *     // Delete user logic
 *   }
 * );
 * ```
 */
export function requirePermission(resource: string, action: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const permissions = req.user.permissions || [];
    const hasPermission = permissions.some((perm: any) => 
      perm.resource === resource && perm.action === action
    );

    if (!hasPermission) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: { resource, action }
      });
      return;
    }

    next();
  };
}