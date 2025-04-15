import APIError from "../../utils/APIError.js";
import { BAD_REQUEST, ErrorMessages } from "../../utils/constants/constants.js";

/**
 * Removes specified values from an array
 * @param {Array} arr - The source array to modify
 * @param {Array} [values=[]] - Values to remove from the array
 * @returns {Array} The modified array with values removed
 * @example
 * const result = arrayOmitter([1, 2, 3, 4], [2, 4]); // Returns [1, 3]
 */
export const arrayOmitter = (arr, values = []) => {
  values.forEach((element) => {
    const index = arr.indexOf(element);
    if (index !== -1) {
      arr.splice(index, 1);
    }
  });
  return arr;
};

/**
 * Handles MongoDB duplicate key errors and formats them into APIError format
 * @param {Error} error - MongoDB error object
 * @returns {APIError|Error} Formatted APIError for duplicates, or original error
 * @example
 * try {
 *   await user.save();
 * } catch (error) {
 *   throw await checkDuplication(error);
 * }
 */
export const checkDuplication = async (error) => {
  const isDuplicateError =
    error.code === 11000 &&
    (error.name === "BulkWriteError" ||
      error.name === "MongoError" ||
      error.name === "MongoServerError");

  if (!isDuplicateError) return error;

  const keys = Object.keys(error.keyPattern);
  if (keys.length === 0) return error;

  const errors = keys.map((key) => ({
    field: key,
    messages: `${key
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")} already in use.`,
  }));

  return new APIError({
    message: ErrorMessages.VALIDATION,
    status: BAD_REQUEST,
    errors,
  });
};

/**
 * Converts a comma-separated string into an array of trimmed values
 * @param {string} field - The comma-separated string to convert
 * @returns {Array|undefined} Array of values or undefined if input is falsy
 * @example
 * getFieldAsArray("a, b, c"); // Returns ["a", "b", "c"]
 */
export const getFieldAsArray = (field) =>
  field ? field.split(",").map((item) => item.trim()) : undefined;

/**
 * Filters out reserved query parameters and MongoDB operators
 * @param {Object} queries - The query object to filter
 * @param {Array} dissolvers - List of reserved keys to remove
 * @returns {Object} Filtered query object
 * @example
 * removeReservedVars({ name: "John", $sort: 1 }, ["$sort"]); // Returns { name: "John" }
 */
export const removeReservedVars = (queries, dissolvers) =>
  Object.keys(queries)
    .filter((key) => !dissolvers.includes(key) && !key.startsWith("$"))
    .reduce((acc, key) => {
      acc[key] = queries[key];
      return acc;
    }, {});

/**
 * Recursively omits specified keys from an object
 * @param {Array} keys - Keys to omit from the object
 * @param {Object} obj - The source object
 * @returns {Object} New object with specified keys omitted
 * @example
 * omitter(['a', 'b'], {a: 1, b: 2, c: 3}); // Returns {c: 3}
 */
/**
 * Recursively omits specified keys from an object
 * @param {Array} keys - Keys to omit from the object
 * @param {Object} obj - The source object
 * @returns {Object} New object with specified keys omitted
 * @example
 * omitter(['a', 'b'], {a: 1, b: 2, c: 3}); // Returns {c: 3}
 */
export const omitter = (keys, obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (!Array.isArray(keys)) return obj;

  try {
    return Object.keys(obj).reduce((acc, key) => {
      if (!keys.includes(key)) {
        acc[key] = obj[key];
      }
      return acc;
    }, {});
  } catch {
    return obj; // Fallback to original object
  }
};
