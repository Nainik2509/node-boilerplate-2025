import mongoose from "mongoose";
import { omitter } from "../../helpers/services/model-helpers.js";
import { CompanyStatus } from "../../utils/constants/enums.js";

/**
 * COMPANY SCHEMA DEFINITION
 *
 * Comprehensive data model for company entities with:
 * - Strict validation and data normalization
 * - Automatic slug generation and synchronization
 * - Status lifecycle management
 * - Optimized query performance
 * - Secure data exposure controls
 */
const companySchema = new mongoose.Schema(
  {
    // ======================
    // CORE FIELDS
    // ======================

    /**
     * Official company name with comprehensive validation
     * - Required field with trimmed whitespace
     * - Maximum length enforcement
     * - Unique index to prevent duplicates
     * - Custom validation for non-empty strings
     */
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [250, "Company name cannot exceed 250 characters"],
      unique: true, // Enforce unique company names
      index: true, // Optimize name-based queries
      validate: {
        validator: (name) => name.trim().length > 0,
        message: "Company name cannot be empty",
      },
      description: "The official registered name of the company",
    },

    /**
     * URL-safe identifier derived from company name
     * - Auto-generated and synchronized with name changes
     * - Strict format validation (lowercase, numbers, hyphens)
     * - Unique index for efficient routing
     */
    slug: {
      type: String,
      trim: true,
      unique: true,
      index: true,
      validate: {
        validator: (slug) => /^[a-z0-9-]+$/.test(slug),
        message: "Slug must contain only lowercase letters, numbers, and hyphens",
      },
      description: "URL-friendly version of company name for routing",
    },

    /**
     * Current operational status
     * - Restricted to predefined enum values
     * - Defaults to ACTIVE for new entities
     * - Indexed for efficient filtering
     */
    status: {
      type: String,
      enum: {
        values: Object.values(CompanyStatus),
        message: `Status must be one of: ${Object.values(CompanyStatus).join(", ")}`,
      },
      default: CompanyStatus.ACTIVE,
      required: true,
      index: true,
      description: "Current operational state of the company",
    },
  },
  {
    // ======================
    // SCHEMA OPTIONS
    // ======================

    /**
     * Timestamp configuration
     * - Automatic createdAt and updatedAt fields
     * - ISO format standardization
     */
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
      currentTime: () => new Date().toISOString(),
    },

    /**
     * JSON serialization options
     * - Includes virtuals in output
     * - Removes version key
     * - Transforms document for API responses
     */
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id; // Remove MongoDB internal ID
        return ret;
      },
    },

    /**
     * Object serialization options
     * - Mirror of JSON options for consistency
     */
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id;
        return ret;
      },
    },

    /**
     * Collation settings
     * - Case-insensitive string comparison
     * - English language rules
     */
    collation: {
      locale: "en",
      strength: 2, // Case-insensitive comparison
    },
  }
);

// ======================
// DATABASE INDEXES
// ======================

/**
 * Strategic indexes optimized for common query patterns:
 * 1. Composite name+status index - For active company lookups
 * 2. Status+created_at index - For time-based dashboard listings
 * 3. Unique slug index - For routing performance
 */
companySchema.index({ name: 1, status: 1 });
companySchema.index({ status: 1, created_at: -1 });
companySchema.index({ slug: 1 }, { unique: true });

// ======================
// MIDDLEWARE
// ======================

/**
 * Pre-save hook for data normalization
 * - Executes before document save operations
 * - Handles name formatting and slug generation
 */
companySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    const businessSuffixes = new Set(["LLC", "Inc", "Ltd", "Co", "Corp"]);

    // Name normalization pipeline
    this.name = normalizeCompanyName(this.name, businessSuffixes);

    // Slug generation with enhanced URL safety
    this.slug = generateSlug(this.name);
  }
  next();
});

/**
 * Pre-update hook for update operations
 * - Executes before findOneAndUpdate operations
 * - Synchronizes slug when name changes
 */
companySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  // Check if name is being modified in the update
  if (update.$set?.name || update.name) {
    const newName = update.$set?.name || update.name;
    const normalizedName = normalizeCompanyName(
      newName,
      new Set(["LLC", "Inc", "Ltd", "Co", "Corp"])
    );
    const newSlug = generateSlug(normalizedName);

    // Update both name (normalized) and slug in the operation
    if (update.$set) {
      update.$set.name = normalizedName;
      update.$set.slug = newSlug;
    } else {
      update.name = normalizedName;
      update.slug = newSlug;
    }
  }
  next();
});

// ======================
// VIRTUAL PROPERTIES
// ======================

/**
 * Display-formatted status (e.g., "active" → "Active")
 */
companySchema.virtual("statusDisplay").get(function () {
  return this.status.charAt(0).toUpperCase() + this.status.slice(1).toLowerCase();
});

/**
 * Fallback slug generator (when not persisted)
 */
companySchema.virtual("slugDisplay").get(function () {
  return this.slug || this.generateSlug();
});

// ======================
// STATIC METHODS
// ======================

companySchema.statics = {
  /**
   * Retrieve active companies sorted alphabetically
   * @returns {Query} Lean query of active companies
   */
  findActive() {
    return this.find({ status: CompanyStatus.ACTIVE }).sort({ name: 1 }).lean();
  },

  /**
   * Case-insensitive name search with regex
   * @param {string} term - Search query
   * @returns {Query} Matching companies
   */
  searchByName(term) {
    return this.find({
      name: {
        $regex: mongoose.escapeRegex(term),
        $options: "i",
      },
    });
  },

  /**
   * Retrieve company by slug
   * @param {string} slug - URL identifier
   * @returns {Query} Found company or null
   */
  findBySlug(slug) {
    return this.findOne({ slug });
  },

  /**
   * Fields excluded from public API responses
   */
  protectedFields: Object.freeze(["__v", "created_at", "updated_at"]),

  /**
   * Fields enabled for full-text search
   */
  searchableFields: Object.freeze(["name", "slug"]),
};

// ======================
// INSTANCE METHODS
// ======================

companySchema.methods = {
  /**
   * Prepare document for API response
   * - Removes protected fields
   * - Includes virtuals
   * @returns {Object} Sanitized company data
   */
  transform() {
    const transformed = this.toObject();
    return omitter(this.constructor.protectedFields, transformed);
  },

  /**
   * Check active status
   * @returns {boolean} True if company is active
   */
  isActive() {
    return this.status === CompanyStatus.ACTIVE;
  },

  /**
   * Generate fresh slug from current name
   * @returns {string} URL-safe identifier
   */
  generateSlug() {
    return generateSlug(this.name);
  },
};

// ======================
// HELPER FUNCTIONS
// ======================

/**
 * Normalizes company name to Title Case while preserving business suffixes
 * @param {string} name - Original company name
 * @param {Set} suffixes - Set of business suffixes to preserve
 * @returns {string} Normalized company name
 */
function normalizeCompanyName(name, suffixes) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word, index, words) => {
      if (!word) return "";
      const isSuffix =
        suffixes.has(word) || (index === words.length - 1 && suffixes.has(word.replace(/\./g, "")));
      return isSuffix ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Generates URL-safe slug from company name
 * @param {string} name - Company name
 * @returns {string} Generated slug
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ======================
// MODEL EXPORT
// ======================

const Company = mongoose.model("company", companySchema);
export { Company };
