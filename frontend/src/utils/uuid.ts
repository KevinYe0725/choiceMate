export const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const part = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${part()}${part()}-${part()}-${part()}-${part()}-${part()}${part()}${part()}`;
};
