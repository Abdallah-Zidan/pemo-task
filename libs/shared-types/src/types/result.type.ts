export type Result<T, E> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: E;
    };

export const Result = {
  success: <T>(data: T): Result<T, never> => ({
    success: true,
    data,
  }),
  error: <E>(error: E): Result<never, E> => ({
    success: false,
    error,
  }),
};
