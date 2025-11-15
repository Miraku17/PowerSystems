/**
 * Authentication Form Types
 */

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  address: string;
  phone: string;
  password: string;
  verifyPassword: string;
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
 * User Types
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  address: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Company Types
 */
export interface Company {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  company: Company;
  createdAt: Date;
  updatedAt: Date;
}

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

export type FormSection =
  | "basicInformation"
  | "engineInformation"
  | "serviceDetails"
  | "warrantyCoverage"
  | "servicesSummary"
  | "signatures";

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
  company?: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
