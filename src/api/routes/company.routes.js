import express from "express";
import { validateRequest } from "../../middleware/validation.middleware.js";
import BaseController from "../controllers/base.controller.js";
import { Company } from "../models/company.model.js";
import { companyValidators } from "../validations/company.validators.js";

const router = express.Router();
const companyController = new BaseController(Company);

/**
 * @api {post} /companies Create a new company
 * @apiGroup Companies
 * @apiVersion 1.0.0
 *
 * @apiBody {String} name Company name (unique)
 * @apiBody {String="active","inactive","suspended"} [status=active] Company status
 *
 * @apiSuccess (201) {Object} data Created company record
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "data": {
 *         "id": "507f1f77bcf86cd799439011",
 *         "name": "ACME CORP",
 *         "status": "active",
 *         "createdAt": "2025-01-01T00:00:00.000Z"
 *       },
 *       "code": 200,
 *       "message": "Successfully created"
 *     }
 */
router.post("/", validateRequest(companyValidators.create), companyController.add);

/**
 * @api {get} /companies List all companies
 * @apiGroup Companies
 * @apiVersion 1.0.0
 *
 * @apiQuery {Number} [page=1] Page number
 * @apiQuery {Number} [perPage=10] Items per page
 * @apiQuery {String} [query] Search term (name)
 * @apiQuery {String} [asc] Fields to sort ascending (comma-separated)
 * @apiQuery {String} [dsc] Fields to sort descending (comma-separated)
 * @apiQuery {String} [fields] Fields to include (comma-separated)
 *
 * @apiSuccess {Object[]} data Array of companies
 * @apiSuccess {Number} [count] Total records (when counter=1)
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "data": [
 *         {
 *           "id": "507f1f77bcf86cd799439011",
 *           "name": "ACME CORP",
 *           "status": "active"
 *         }
 *       ],
 *       "code": 200,
 *       "count": 1,
 *       "message": "Successfully retrieved"
 *     }
 */
router.get("/", companyController.list);

/**
 * @api {patch} /companies/:id Update a company
 * @apiGroup Companies
 * @apiVersion 1.0.0
 *
 * @apiParam {String} id Company ID
 * @apiBody {String} [name] Updated company name
 * @apiBody {String} [status] Updated status
 *
 * @apiSuccess {Object} data Updated company record
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "data": {
 *         "id": "507f1f77bcf86cd799439011",
 *         "name": "ACME CORPORATION",
 *         "status": "active"
 *       },
 *       "code": 200,
 *       "message": "Successfully updated"
 *     }
 */
router.patch("/:id", validateRequest(companyValidators.update), companyController.update);

export default router;
