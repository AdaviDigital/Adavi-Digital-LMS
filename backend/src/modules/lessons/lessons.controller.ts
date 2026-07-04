import { Request, Response, NextFunction } from 'express';
import { lessonsService } from './lessons.service';
import { AppError } from '../../utils/AppError';

export const lessonsController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const lesson = await lessonsService.create(req.user.sub, req.user.role === 'ADMIN', req.body);
      res.status(201).json({ success: true, data: lesson });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const lesson = await lessonsService.getById(req.params.id, req.user?.sub);
      res.status(200).json({ success: true, data: lesson });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const lesson = await lessonsService.update(req.params.id, req.user.sub, req.user.role === 'ADMIN', req.body);
      res.status(200).json({ success: true, data: lesson });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      await lessonsService.remove(req.params.id, req.user.sub, req.user.role === 'ADMIN');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async addResource(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const resource = await lessonsService.addResource(
        req.params.id,
        req.user.sub,
        req.user.role === 'ADMIN',
        req.body,
      );
      res.status(201).json({ success: true, data: resource });
    } catch (err) {
      next(err);
    }
  },

  async recordProgress(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const progress = await lessonsService.recordProgress(req.params.id, req.user.sub, req.body);
      res.status(200).json({ success: true, data: progress });
    } catch (err) {
      next(err);
    }
  },

  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const lessons = await lessonsService.reorder(
        req.user.sub,
        req.user.role === 'ADMIN',
        req.body.moduleId,
        req.body.orderedLessonIds,
      );
      res.status(200).json({ success: true, data: lessons });
    } catch (err) {
      next(err);
    }
  },
};
