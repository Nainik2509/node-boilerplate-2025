import {
  arrayOmitter,
  checkDuplication,
  getFieldAsArray,
  removeReservedVars,
} from "../../helpers/services/model-helpers.js";
import APIError from "../../utils/APIError.js";
import {
  CREATED,
  ErrorMessages,
  NOT_FOUND,
  OK,
  SuccessMessages,
} from "../../utils/constants/constants.js";
import { reservedVar } from "../../utils/constants/settings.js";

/**
 * Base Controller Class
 *
 * Provides a robust foundation for RESTful CRUD operations with:
 * - Standardized response formats (success/error)
 * - Comprehensive query capabilities (pagination, sorting, filtering)
 * - Built-in field selection and population
 * - Automatic error handling
 * - Search functionality (including text search)
 * - Protection of sensitive fields
 *
 * Designed to be extended by specific model controllers to reduce boilerplate.
 *
 * Key Features:
 * - Consistent API response structure
 * - Built-in pagination and sorting
 * - Field projection for optimized queries
 * - Automatic population of referenced documents
 * - Full-text search support
 * - Protection of sensitive fields
 * - Comprehensive error handling
 */
class BaseController {
  /**
   * Create a new BaseController instance
   * @param {mongoose.Model} model - Mongoose model this controller will manage
   */
  constructor(model) {
    this._model = model;
    // Bind methods to ensure proper 'this' context
    this.add = this.add.bind(this);
    this.list = this.list.bind(this);
    this.get = this.get.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  // ======================
  // PUBLIC CRUD METHODS
  // ======================

  /**
   * Create a new document in the database
   *
   * Handles:
   * - Document creation with validation
   * - Duplicate key error detection
   * - Consistent response formatting
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware
   * @returns {Promise<Response>} JSON response with created document or error
   */
  async add(req, res, next) {
    try {
      const objModel = new this._model(req.body);
      const savedObject = await objModel.save().catch(async (err) => {
        throw await checkDuplication(err);
      });

      return res.status(CREATED).json({
        data: savedObject.transform(),
        code: OK,
        message: SuccessMessages.CREATED,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieve multiple documents with advanced query capabilities
   *
   * Features:
   * - Pagination (page, perPage)
   * - Sorting (asc, dsc query params)
   * - Field selection (fields query param)
   * - Population of references (populateMap in body)
   * - Full-text search (query param)
   * - Regular filtering (any model field as query param)
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware
   * @returns {Promise<Response>} JSON response with documents or error
   */
  async list(req, res, next) {
    try {
      // Initialize query parameters
      const findQuery = removeReservedVars(req.query, reservedVar);
      const { page = 1, perPage = 10 } = req.query;
      const shouldPaginate = !!req.query.perPage;

      // Build query components
      const sortOrder = this._buildSortOrder(req);
      const attributes = this._buildFieldSelection(req);
      const queryConditions = this._buildQueryConditions(req, findQuery);

      // Get total count of matching documents (for pagination info)
      const totalCount = await this._model.countDocuments(queryConditions);

      // Construct base query
      const query = this._model.find(queryConditions).select(attributes).sort(sortOrder);

      // Add population if requested
      if (req.body?.populateMap) {
        query.populate(req.body.populateMap);
      }

      // Apply pagination if requested
      if (shouldPaginate) {
        query.skip((page - 1) * perPage).limit(perPage);
      }

      // Execute query
      const results = await query.exec();

      return res.status(OK).json({
        data: results,
        code: OK,
        count: results.length, // Current page count
        total: totalCount, // Total matching documents count
        message: results.length > 0 ? SuccessMessages.RETRIEVED : ErrorMessages.NOT_FOUND,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieve a single document by ID
   *
   * Features:
   * - Population of referenced documents
   * - 404 handling for missing documents
   * - Consistent response formatting
   *
   * @param {Object} req - Express request object (must contain params.id)
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware
   * @returns {Promise<Response>} JSON response with document or 404 error
   */
  async get(req, res, next) {
    try {
      const record = await this._model
        .findById(req.params.id)
        .populate(getFieldAsArray(req.query.populate))
        .orFail(() => {
          throw new APIError({
            message: ErrorMessages.NOT_FOUND,
            status: NOT_FOUND,
          });
        });

      return res.status(OK).json({
        data: record.transform(),
        code: OK,
        message: SuccessMessages.RETRIEVED,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update an existing document
   *
   * Features:
   * - Full validation on update
   * - Duplicate key error detection
   * - Population of referenced documents
   * - 404 handling for missing documents
   *
   * @param {Object} req - Express request object (must contain params.id)
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware
   * @returns {Promise<Response>} JSON response with updated document or error
   */
  async update(req, res, next) {
    try {
      const query = this._model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      // Add population if requested
      if (req.body?.populateMap) {
        query.populate(req.body.populateMap);
      }

      const updatedRecord = await query
        .orFail(() => {
          throw new APIError({
            message: ErrorMessages.NOT_FOUND,
            status: NOT_FOUND,
          });
        })
        .catch(async (err) => {
          throw await checkDuplication(err);
        });

      return res.status(OK).json({
        data: updatedRecord.transform(),
        code: OK,
        message: SuccessMessages.UPDATED,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Delete a document
   *
   * Features:
   * - 404 handling for missing documents
   * - Consistent response formatting
   *
   * @param {Object} req - Express request object (must contain params.id)
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware
   * @returns {Promise<Response>} JSON response confirming deletion or error
   */
  async delete(req, res, next) {
    try {
      const record = await this._model.findByIdAndDelete(req.params.id).orFail(() => {
        throw new APIError({
          message: ErrorMessages.NOT_FOUND,
          status: NOT_FOUND,
        });
      });

      return res.status(OK).json({
        data: record,
        code: OK,
        message: SuccessMessages.DELETED,
      });
    } catch (error) {
      return next(error);
    }
  }

  // ======================
  // PROTECTED HELPER METHODS
  // ======================

  /**
   * Construct sort order object from request query parameters
   *
   * Parses 'asc' and 'dsc' query parameters to build MongoDB sort object
   *
   * @param {Object} req - Express request object
   * @returns {Object} Sort order specification (e.g., { name: 1, date: -1 })
   */
  _buildSortOrder(req) {
    const asc = getFieldAsArray(req.query.asc) || [];
    const dsc = getFieldAsArray(req.query.dsc) || [];
    const sortOrder = {};

    asc.forEach((field) => (sortOrder[field] = 1)); // Ascending
    dsc.forEach((field) => (sortOrder[field] = -1)); // Descending

    return sortOrder;
  }

  /**
   * Apply search query to request parameters
   *
   * Adds regex search conditions for all searchable fields defined in the model
   *
   * @param {Object} queryObj - Query parameters object
   * @returns {Object} Enhanced query object with search conditions
   */
  _applySearchQuery(queryObj) {
    const searchables = this._model.searchableFields;
    return {
      ...queryObj,
      ...Object.fromEntries(searchables.map((field) => [`$${field}`, queryObj.query])),
    };
  }

  /**
   * Build MongoDB projection object for field selection
   *
   * Handles both inclusion and exclusion of fields, automatically protecting
   * sensitive fields defined in the model.
   *
   * @param {Object} req - Express request object
   * @returns {Object|String} MongoDB projection object or field string
   */
  _buildFieldSelection(req) {
    let attributes = getFieldAsArray(req.query.fields);
    const excludedFields = this._model.protectedFields; // Sensitive fields to protect

    // If no specific fields requested, exclude sensitive fields only
    if (!attributes) {
      return excludedFields.reduce((proj, field) => {
        proj[field] = 0;
        return proj;
      }, {});
    }

    // Positive projection - include only requested non-sensitive fields
    attributes = arrayOmitter(attributes, excludedFields);
    return attributes.length ? attributes.join(" ") : null;
  }

  /**
   * Construct final query conditions based on request parameters
   *
   * Handles both regular field filters and full-text search when available.
   *
   * @param {Object} req - Express request object
   * @param {Object} findQuery - Initial query conditions
   * @returns {Object} Final query conditions for MongoDB
   */
  /**
   * Construct final query conditions based on request parameters
   *
   * Handles both regular field filters and full-text search when available.
   * Explicitly excludes pagination and sorting parameters from becoming query conditions.
   *
   * @param {Object} req - Express request object
   * @param {Object} findQuery - Initial query conditions
   * @returns {Object} Final query conditions for MongoDB
   */
  _buildQueryConditions(req, findQuery) {
    // Initialize with cleaned query parameters
    const finalQuery = { ...findQuery };

    // Handle search query if present
    if (req.query.query) {
      // First check for text index
      const hasTextIndex = this._model.schema
        .indexes()
        .some((idx) => Object.values(idx[0]).includes("text"));

      if (hasTextIndex) {
        return { $text: { $search: req.query.query }, ...finalQuery };
      }

      // Fallback to regex search on searchable fields
      const searchConditions = {};
      this._model.searchableFields.forEach((field) => {
        searchConditions[field] = {
          $regex: req.query.query,
          $options: "i",
        };
      });

      if (Object.keys(searchConditions).length > 0) {
        finalQuery.$or = Object.entries(searchConditions).map(([field, condition]) => ({
          [field]: condition,
        }));
      }
    }

    // Handle other standard query parameters
    Object.entries(req.query).forEach(([key, value]) => {
      if (!key.startsWith("$") && !reservedVar.includes(key)) {
        finalQuery[key] = value;
      }
    });

    return finalQuery;
  }
}

export default BaseController;
