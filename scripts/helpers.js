const stringIdsToObject = string => {
  const ids = {};
  if (!string) return ids;
  string.split(',').forEach(initId => {
    const [key, id] = initId.split(':');
    ids[key] = Number(id);
  });

  return ids;
};

const stringToArray = string => string.split(',');

module.exports = {
  stringIdsToObject,
  stringToArray,
};
