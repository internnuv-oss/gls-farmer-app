import { z } from 'zod';

// Helper to calculate age from a date string (YYYY-MM-DD)
const calculateAge = (dob: string) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const seOnboardingSchema = z.object({
  // Section 1: Personal Details
  firstName: z.string().min(2, "First Name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Last Name is required"),
  dob: z.string().refine((date) => calculateAge(date) >= 18, {
    message: "You must be at least 18 years old",
  }),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], {
    message: "Select a valid blood group",
  }),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"], {
    message: "Select marital status",
  }),
  spouseName: z.string().optional(),
  spouseMobile: z.string().optional(),
  mobileNumber: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits"),
  emailId: z.string().email("Invalid email format"),
  permanentAddress: z.string().min(10, "Full permanent address required"),
  sameAsPermanent: z.boolean().default(false),
  currentAddress: z.string().min(10, "Full current address required"),

  // Section 2: Organization & Hierarchy
  employeeId: z.string().min(2, "Employee ID is required"),
  designation: z.string().min(2, "Designation is required"),
  reportingTo: z.string().min(2, "Reporting Manager is required"),
  joiningDate: z.string().min(8, "Joining date is required"),
  headquarter: z.string().min(2, "HQ is required"),
  territory: z.string().min(2, "Territory is required"),
  area: z.string().min(2, "Area is required"),

  // Section 3: Statutory & Financial
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN Format"),
  bankName: z.string().min(2, "Bank Name is required"),
  bankAccountNumber: z.string().regex(/^\d{9,18}$/, "Must be 9-18 digits"),
  bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Format"),
  pfPensionNumber: z.string().optional(),

  // Section 4: Assets & Logistics
  vehicleType: z.enum(["Two-Wheeler", "Four-Wheeler"], {
    message: "Select a vehicle type",
  }),
  drivingLicenseNo: z.string().min(5, "Driving License No. is required"),
  dlExpiryDate: z.string().min(8, "DL Expiry Date is required"),
  companyAssets: z.array(z.string()).optional(), 
  fuelAllowance: z.string().optional(),

  // Section 5: Document Management
  documents: z.object({
    profilePhoto: z.string().url("Profile photo is required").optional(), 
    identityProof: z.string().url("Identity proof is required").optional(),
    addressProof: z.string().url("Address proof is required").optional(),
    relievingLetter: z.string().optional(),
    educationalCertificates: z.array(z.string()).optional(),
  }).optional()
}).superRefine((data, ctx) => {
  // Conditional Validation: If Married, Spouse details are required
  if (data.maritalStatus === "Married") {
    if (!data.spouseName || data.spouseName.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["spouseName"],
        message: "Spouse Name is required if married",
      });
    }
    if (!data.spouseMobile || !/^\d{10,12}$/.test(data.spouseMobile)) {
      ctx.addIssue({
        code: "custom",
        path: ["spouseMobile"],
        message: "Valid Spouse Mobile (10-12 digits) is required",
      });
    }
  }
});

export type SEOnboardingValues = z.infer<typeof seOnboardingSchema>;