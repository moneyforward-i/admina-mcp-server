import { z } from "zod";
import { getClient } from "../admina-api.js";

const EmployeeStatusEnum = z.enum(["active", "on_leave", "draft", "preactive", "retired", "untracked", "archived"]);

const EmployeeTypeEnum = z.enum([
  "board_member",
  "full_time_employee",
  "fixed_time_employee",
  "temporary_employee",
  "part_time_employee",
  "secondment_employee",
  "contract_employee",
  "collaborator",
  "group_address",
  "shared_address",
  "test_address",
  "other",
  "unknown",
  "unregistered",
]);

const ManagementTypeEnum = z.enum(["managed", "external", "system", "unknown", "unregistered"]);

const DepartmentSchema = z.object({
  name: z.string().nullable().optional(),
});

const LifecycleSchema = z.object({
  contractStartAt: z.string().nullable().optional().describe("Contract start date (YYYY-MM-DD)"),
  contractEndAt: z.string().nullable().optional().describe("Contract end date (YYYY-MM-DD)"),
  suspensionStartAt: z.string().nullable().optional().describe("Suspension start date (YYYY-MM-DD)"),
  suspensionEndAt: z.string().nullable().optional().describe("Suspension end date (YYYY-MM-DD)"),
});

const ManagerSchema = z.object({
  id: z.string().nullable().optional().describe("Manager identity ID"),
});

export const CreateIdentitySchema = z.object({
  employeeStatus: EmployeeStatusEnum.describe("Extended status of the employee"),
  employeeType: EmployeeTypeEnum.describe("Type of the employee"),
  firstName: z.string().describe("First name of the employee"),
  lastName: z.string().describe("Last name of the employee"),
  managementType: ManagementTypeEnum.nullable().optional().describe("Management type of the employee"),
  displayName: z.string().nullable().optional().describe("Display name of the employee"),
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

export type CreateIdentityParams = z.infer<typeof CreateIdentitySchema>;

function toBody(params: CreateIdentityParams): Record<string, unknown> {
  const body: Record<string, unknown> = {
    employeeStatus: params.employeeStatus,
    employeeType: params.employeeType,
    firstName: params.firstName,
    lastName: params.lastName,
  };
  if (params.managementType !== undefined) body.managementType = params.managementType;
  if (params.displayName !== undefined) body.displayName = params.displayName;
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

export async function createIdentity(params: CreateIdentityParams) {
  const client = getClient();
  return client.makePostApiCall("/identity", new URLSearchParams(), toBody(params));
}
