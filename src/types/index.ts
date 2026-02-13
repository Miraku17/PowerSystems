/**
 * Authentication Form Types
 */

export interface LoginForm {
  email: string;
  password: string;
}

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Position Types
 */
export interface Position {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
}

/**
 * User Types
 */
export interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  username: string;
  address: string;
  phone: string;
  position_id: string | null;
  position?: Position;
  // role: "user" | "admin"; // commented out - now using position_id
}

/**
 * Customer Types
 */
export interface Customer {
  id: string;
  name: string;
  equipment: string;
  customer: string;
  contactPerson: string;
  address: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Company Types
 */
export interface Company {
  id: string;
  name: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCompanyData = Omit<Company, "id" | "createdAt" | "updatedAt" | "imageUrl"> & {
  image?: File;
};

/**
 * Engine Types
 */
export interface Engine {
  id: string;
  model: string;
  serialNo: string;
  altBrandModel: string;
  equipModel: string;
  equipSerialNo: string;
  altSerialNo: string;
  location: string;
  rating: string;
  rpm: string;
  startVoltage: string;
  runHours: string;
  fuelPumpSN: string;
  fuelPumpCode: string;
  lubeOil: string;
  fuelType: string;
  coolantAdditive: string;
  turboModel: string;
  turboSN: string;
  imageUrl?: string;
  company: Company;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateEngineData = Omit<Engine, "id" | "createdAt" | "updatedAt" | "company" | "imageUrl"> & {
  companyId: string;
  image?: File;
};

/**
 * Company Form Field Types
 */
export type FormFieldType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "file";

export type FormSection = string;

export interface CustomSection {
  id: string;
  name: string; // Field name for DB (e.g., "newSection")
  label: string; // Display label (e.g., "New Section")
  order: number;
  sectionNumber?: number; // Order for displaying in forms (1, 2, 3, etc.)
}

export interface DynamicField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: string[]; // For select, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  order: number;
  section?: FormSection;
}

export interface BackendField {
  fieldName: string;
  fieldType: string;
  required: boolean;
  label?: string;
  placeholder?: string;
  options?: string[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  section?: FormSection;
}

export interface CompanyForm {
  id: string;
  name: string;
  formType: string;
  companyId?: string;
  customerId?: string;
  engineId?: string;
  dynamicFields?: DynamicField[]; // Frontend format (deprecated)
  fields?: BackendField[]; // Backend format (new)
  sections?: CustomSection[]; // Custom sections
  company?: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
