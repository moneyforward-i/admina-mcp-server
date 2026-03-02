import { z } from "zod";
import { getClient } from "../admina-api.js";
import {
  DepartmentSchema,
  EmployeeStatusEnum,
  EmployeeTypeEnum,
  LifecycleSchema,
  ManagementTypeEnum,
  ManagerSchema,
} from "../common/identity-schemas.js";

// identityUpdates mirrors BulkIdentityDto which is a PartialType of IdentityDto –
// all identity fields are optional
const IdentityUpdatesSchema = z.object({
  employeeStatus: EmployeeStatusEnum.optional().describe("Extended status of the employee"),
  employeeType: EmployeeTypeEnum.optional().describe("Type of the employee"),
  managementType: ManagementTypeEnum.nullable().optional().describe("Management type of the employee"),
  displayName: z.string().nullable().optional().describe("Display name of the employee"),
  firstName: z.string().nullable().optional().describe("First name of the employee"),
  lastName: z.string().nullable().optional().describe("Last name of the employee"),
  primaryEmail: z.string().nullable().optional().describe("Primary email of the employee"),
  secondaryEmails: z.array(z.string()).nullable().optional().describe("Secondary emails of the employee"),
  companyName: z.string().nullable().optional().describe("Company name of the employee"),
  workLocation: z.string().nullable().optional().describe("Work location of the employee"),
  department: DepartmentSchema.nullable().optional().describe("Department of the employee"),
  jobTitle: z.string().nullable().optional().describe("Job title of the employee"),
  employeeId: z.string().nullable().optional().describe("Employee ID of the employee"),
  lifecycle: LifecycleSchema.optional().describe("Lifecycle of the employee"),
  note: z.string().nullable().optional().describe("Notes of the employee"),
  customFields: z.record(z.string(), z.unknown()).optional().describe("Custom fields of the employee"),
  manager: ManagerSchema.optional().describe("Manager of the employee"),
});

export const BulkUpdateIdentitiesSchema = z.object({
  identityIds: z
    .array(z.string().min(1))
    .min(1)
    .max(50)
    .describe("Array of identity IDs to update (1-50 items)"),
  identityUpdates: IdentityUpdatesSchema.describe(
    "Identity updates to apply to all selected identities. All fields are optional.",
  ),
});

export type BulkUpdateIdentitiesParams = z.infer<typeof BulkUpdateIdentitiesSchema>;

export async function bulkUpdateIdentities(params: BulkUpdateIdentitiesParams) {
  const client = getClient();

  const { identityUpdates } = params;

  const updates: Record<string, unknown> = {};
  if (identityUpdates.employeeStatus !== undefined) updates.employeeStatus = identityUpdates.employeeStatus;
  if (identityUpdates.employeeType !== undefined) updates.employeeType = identityUpdates.employeeType;
  if (identityUpdates.managementType !== undefined) updates.managementType = identityUpdates.managementType;
  if (identityUpdates.displayName !== undefined) updates.displayName = identityUpdates.displayName;
  if (identityUpdates.firstName !== undefined) updates.firstName = identityUpdates.firstName;
  if (identityUpdates.lastName !== undefined) updates.lastName = identityUpdates.lastName;
  if (identityUpdates.primaryEmail !== undefined) updates.primaryEmail = identityUpdates.primaryEmail;
  if (identityUpdates.secondaryEmails !== undefined) updates.secondaryEmails = identityUpdates.secondaryEmails;
  if (identityUpdates.companyName !== undefined) updates.companyName = identityUpdates.companyName;
  if (identityUpdates.workLocation !== undefined) updates.workLocation = identityUpdates.workLocation;
  if (identityUpdates.department !== undefined) updates.department = identityUpdates.department;
  if (identityUpdates.jobTitle !== undefined) updates.jobTitle = identityUpdates.jobTitle;
  if (identityUpdates.employeeId !== undefined) updates.employeeId = identityUpdates.employeeId;
  if (identityUpdates.lifecycle !== undefined) updates.lifecycle = identityUpdates.lifecycle;
  if (identityUpdates.note !== undefined) updates.note = identityUpdates.note;
  if (identityUpdates.customFields !== undefined) updates.customFields = identityUpdates.customFields;
  if (identityUpdates.manager !== undefined) updates.manager = identityUpdates.manager;

  const body: Record<string, unknown> = {
    identityIds: params.identityIds,
    identityUpdates: updates,
  };

  return client.makePatchApiCall("/identity/bulk", body);
}
