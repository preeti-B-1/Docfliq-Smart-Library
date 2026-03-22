export const SPECIALTIES = [
  "Cardiology",
  "Neurology",
  "Oncology",
  "Pediatrics",
  "Orthopedics",
  "Dermatology",
  "Gastroenterology",
  "Pulmonology",
  "Endocrinology",
  "Nephrology",
  "Psychiatry",
  "Radiology",
  "Emergency Medicine",
  "Obstetrics & Gynecology",
  "Infectious Disease",
  "Surgery (General)",
  "Ophthalmology",
  "Anesthesiology",
  "Hematology",
  "Rheumatology",
  "Urology",
  "ENT / Otolaryngology",
  "Internal Medicine",
  "Family Medicine",
  "Critical Care / ICU Medicine",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
} as const;

export const UPLOAD_CONFIG = {
  maxFileSizeBytes: 25 * 1024 * 1024,
  maxBulkFiles: 10,
  acceptedTypes: [".pdf", ".docx"],
  acceptedMimeTypes: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
} as const;

export const ASK_AI_CONFIG = {
  maxMessages: 10,
} as const;

export const PAGINATION_CONFIG = {
  defaultPageSize: 10,
} as const;
