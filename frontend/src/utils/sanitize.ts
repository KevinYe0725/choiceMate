export const sanitizeProblem = (problem: string) => problem.trim();

export const sanitizeOptions = (options: string[]) =>
  options
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
