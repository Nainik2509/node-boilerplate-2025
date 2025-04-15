import Joi from "joi";
import { CompanyStatus } from "../../utils/constants/enums.js";

/**
 * Company request validators following OpenAPI 4.0 standards
 */
export const companyValidators = {
  /**
   * Create company validation schema
   */
  create: Joi.object({
    name: Joi.string()
      .trim()
      .max(250)
      .required()
      .description("Unique company name")
      .example("ACME Corp"),

    status: Joi.string()
      .valid(...Object.values(CompanyStatus))
      .default(CompanyStatus.ACTIVE)
      .description("Company operational status"),
  }),

  /**
   * Update company validation schema
   */
  update: Joi.object({
    name: Joi.string().trim().max(250).description("Updated company name"),

    status: Joi.string()
      .valid(...Object.values(CompanyStatus))
      .description("Updated company status"),
  }).min(1), // Require at least one field to update
};
