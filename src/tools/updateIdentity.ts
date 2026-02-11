import { z } from "zod";
import { getClient } from "../admina-api.js";
import {
  EmployeeStatusEnum,
  EmployeeTypeEnum,
  ManagementTypeEnum,
  DepartmentSchema,
  LifecycleSchema,
  ManagerSchema,
} from "../common/identity-schemas.js";

export const UpdateIdentitySchema = z.object({
  identityId: z.string().describe("The ID of the identity to update"),
  employeeStatus: EmployeeStatusEnum.optional().describe("Extended status of the employee"),
  employeeType: EmployeeTypeEnum.optional().describe("Type of the employee"),
  managementType: ManagementTypeEnum.nullable().optional().describe("Management type of the employee"),
  displayName: z.string().nullable().optional().describe("Display name of the employee"),
  firstName: z.string().optional().describe("First name of the employee"),
  lastName: z.string().optional().describe("Last name of the employee"),
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

export type UpdateIdentityParams = z.infer<typeof UpdateIdentitySchema>;

function toBody(params: Omit<UpdateIdentityParams, "identityId">): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (params.employeeStatus !== undefined) body.employeeStatus = params.employeeStatus;
  if (params.employeeType !== undefined) body.employeeType = params.employeeType;
  if (params.managementType !== undefined) body.managementType = params.managementType;
  if (params.displayName !== undefined) body.displayName = params.displayName;
  if (params.firstName !== undefined) body.firstName = params.firstName;
  if (params.lastName !== undefined) body.lastName = params.lastName;
  if (params.primaryEmail !== undefined) body.primaryEmail = params.primaryEmail;
  if (params.secondaryEmails !== undefined) body.secondaryEmails = params.secondaryEmails;
  if (params.companyName !== undefined) body.companyName = params.companyName;
  if (params.workLocation !== undefined) body.workLocation = params.workLocation;
  if (params.department !== undefined) body.department = params.department;
  if (params.jobTitle !== undefined) body.jobTitle = params.jobTitle;
  if (params.employeeId !== undefined) body.employeeId = params.employeeId;
  if (params.lifecycle !== undefined) body.lifecycle = params.lifecycle;
  if (params.note !== undefined) body.note = params.note;
  if (params.customFields !== undefined) body.customFields = params.customFields;
  if (params.manager !== undefined) body.manager = params.manager;
  return body;
}

export async function updateIdentity(params: UpdateIdentityParams) {
  const client = getClient();
  const { identityId, ...rest } = params;
  return client.makePutApiCall(`/identity/${identityId}`, toBody(rest));
}
