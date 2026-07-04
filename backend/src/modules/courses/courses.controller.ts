import { Request, Response, NextFunction } from 'express';
import { coursesService } from './courses.service';
import { AppError } from '../../utils/AppError';

export const coursesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await coursesService.list(req.query as any);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async myCourses(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const data = await coursesService.myCourses(req.user.sub);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getForBuilder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const course = await coursesService.getForBuilder(req.params.id, req.user.sub, req.user.role === 'ADMIN');
      res.status(200).json({ success: true, data: course });
    } catch (err) {
      next(err);
    }
  },

  async submitForReview(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const course = await coursesService.submitForReview(req.params.id, req.user.sub);
      res.status(200).json({ success: true, data: course });
    } catch (err) {
      next(err);
    }
  },

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await coursesService.getBySlug(req.params.slug);
      res.status(200).json({ success: true, data: course });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const course = await coursesService.create(req.user.sub, req.body);
      res.status(201).json({ success: true, data: course });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const course = await coursesService.update(
        req.params.id,
        req.user.sub,
        req.user.role === 'ADMIN',
        req.body,
      );
      res.status(200).json({ success: true, data: course });
    } catch (err) {
      next(err);
    }
  },

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const course = await coursesService.publish(req.params.id, req.user.role === 'ADMIN');
      res.status(200).json({ success: true, data: course });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      await coursesService.remove(req.params.id, req.user.sub, req.user.role === 'ADMIN');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
