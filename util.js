export const isEmpty = (val) => {
  return val === undefined || val === null || val === '' || isNaN(Number(val));
};
