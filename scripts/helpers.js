const stringIdsToObject = string => {
  const ids = {};
  if (!string) return ids;
  string.split(',').forEach(initId => {
    const [key, id] = initId.split(':');
    ids[key] = BigInt(id);
  });

  return ids;
};

module.exports = {
  stringIdsToObject,
};
