import { z } from "zod";

export const complaintFieldsSchema = z.object({
  complaint_source: z.string().min(1, "Complaint source is required"),
  customer_name: z.string().min(1, "Customer name is required"),
  product_name: z.string().min(1, "Product name is required"),
  product_strength: z.string().optional().default(""),
  batch_number: z.string().min(1, "Batch number is required"),
  manufacturing_date: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), "Invalid date format"),
  expiry_date: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), "Invalid date format"),
  quantity_affected: z.string().optional().default(""),
  complaint_type: z.string().min(1, "Complaint type is required"),
  complaint_date: z
    .string()
    .min(1, "Complaint date is required")
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), "Invalid date format"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  initial_severity: z.enum(["Critical", "Major", "Minor"], {
    errorMap: () => ({ message: "Severity is required" }),
  }),
  priority: z.enum(["High", "Medium", "Low"], {
    errorMap: () => ({ message: "Priority is required" }),
  }),
});

export type ComplaintFormData = z.infer<typeof complaintFieldsSchema>;

export function validateComplaint(data: Record<string, unknown>) {
  return complaintFieldsSchema.safeParse(data);
}
