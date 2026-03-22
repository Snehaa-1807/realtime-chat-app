const bcrypt = require("bcryptjs");

const hashValue = async (value, salt = 10) => {
  return await bcrypt.hash(value, salt);
};

const compareValue = async (value, hashedVal) => {
  return await bcrypt.compare(value, hashedVal);
};

module.exports = { hashValue, compareValue };
