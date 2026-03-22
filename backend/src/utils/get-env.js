const getEnv = (key, defaultValue) => {
  const val = process.env[key];
  // If value exists in env, return it
  if (val !== undefined && val !== null) return val;
  // If a default was provided, return it (even if empty string)
  if (defaultValue !== undefined) return defaultValue;
  // No value and no default — throw
  throw new Error("Missing required env variable: " + key);
};

module.exports = { getEnv };