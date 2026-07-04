import { AppError } from '../src/utils/AppError';

describe('AppError', () => {
  it('sets statusCode, message, and isOperational', () => {
    const err = new AppError(404, 'Course not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Course not found');
    expect(err.isOperational).toBe(true);
  });

  it('carries optional details', () => {
    const err = new AppError(422, 'Validation failed', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });

  it('is an instance of Error', () => {
    const err = new AppError(500, 'Something broke');
    expect(err).toBeInstanceOf(Error);
  });
});
