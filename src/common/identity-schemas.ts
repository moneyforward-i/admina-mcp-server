import { z } from "zod";

export const EmployeeStatusEnum = z.enum([
  "active",
  "on_leave",
  "draft",
  "preactive",
  "retired",
  "untracked",
  "archived",
]);

export const EmployeeTypeEnum = z.enum([
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

export const ManagementTypeEnum = z.enum(["managed", "external", "system", "unknown", "unregistered"]);

export const DepartmentSchema = z.object({
  name: z.string().nullable().optional(),
});

export const LifecycleSchema = z.object({
  contractStartAt: z.string().nullable().optional().describe("Contract start date (YYYY-MM-DD)"),
  contractEndAt: z.string().nullable().optional().describe("Contract end date (YYYY-MM-DD)"),
  suspensionStartAt: z.string().nullable().optional().describe("Suspension start date (YYYY-MM-DD)"),
  suspensionEndAt: z.string().nullable().optional().describe("Suspension end date (YYYY-MM-DD)"),
});

export const ManagerSchema = z.object({
  id: z.string().nullable().optional().describe("Manager identity ID"),
});
