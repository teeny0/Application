/**
 * ชนิดข้อมูลของฐานข้อมูล Supabase
 * ต้องตรงกับไฟล์ supabase/migrations/001_init.sql และ 002_user_approval.sql
 * ถ้าเปลี่ยนสคีมาให้แก้ทั้งสองที่
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "admin" | "technician";
export type MachineStatus = "running" | "stop" | "alarm" | "maintenance";
export type AlarmStatus = "open" | "in_progress" | "closed";
export type MaintenanceStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";
export type MaintenancePriority = "low" | "medium" | "high" | "critical";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  /** Admin อนุมัติแล้วหรือยัง — ยังไม่อนุมัติจะเข้าใช้ระบบไม่ได้ */
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

type MachineRow = {
  id: string;
  machine_code: string;
  machine_name: string;
  machine_type: string;
  location: string;
  status: MachineStatus;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type AlarmRow = {
  id: string;
  machine_id: string;
  alarm_code: string;
  alarm_description: string;
  occurred_at: string;
  cause: string | null;
  status: AlarmStatus;
  reported_by: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type MaintenanceRow = {
  id: string;
  machine_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  completed_at: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  cost: number | null;
  parts_used: string | null;
  notes: string | null;
  created_by: string | null;
  technician_id: string | null;
  created_at: string;
  updated_at: string;
};

type CountRow = { status: string; total: number };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at" | "updated_at"> &
          Partial<Pick<ProfileRow, "created_at" | "updated_at">>;
        Update: Partial<Omit<ProfileRow, "id">>;
        Relationships: [];
      };
      machines: {
        Row: MachineRow;
        Insert: Omit<
          MachineRow,
          "id" | "created_at" | "updated_at" | "status" | "created_by"
        > &
          Partial<
            Pick<MachineRow, "id" | "status" | "created_by" | "created_at" | "updated_at">
          >;
        Update: Partial<Omit<MachineRow, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "machines_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      alarms: {
        Row: AlarmRow;
        Insert: Omit<
          AlarmRow,
          | "id"
          | "status"
          | "occurred_at"
          | "resolved_at"
          | "reported_by"
          | "created_at"
          | "updated_at"
        > &
          Partial<
            Pick<
              AlarmRow,
              | "id"
              | "status"
              | "occurred_at"
              | "resolved_at"
              | "reported_by"
              | "created_at"
              | "updated_at"
            >
          >;
        Update: Partial<Omit<AlarmRow, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "alarms_machine_id_fkey";
            columns: ["machine_id"];
            isOneToOne: false;
            referencedRelation: "machines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alarms_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alarms_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_records: {
        Row: MaintenanceRow;
        Insert: Omit<
          MaintenanceRow,
          | "id"
          | "status"
          | "priority"
          | "completed_at"
          | "cost"
          | "created_by"
          | "created_at"
          | "updated_at"
        > &
          Partial<
            Pick<
              MaintenanceRow,
              | "id"
              | "status"
              | "priority"
              | "completed_at"
              | "cost"
              | "created_by"
              | "created_at"
              | "updated_at"
            >
          >;
        Update: Partial<Omit<MaintenanceRow, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "maintenance_records_machine_id_fkey";
            columns: ["machine_id"];
            isOneToOne: false;
            referencedRelation: "machines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      machine_status_counts: {
        Row: CountRow;
        Relationships: [];
      };
      alarm_status_counts: {
        Row: CountRow;
        Relationships: [];
      };
    };
    Functions: {
      current_role: { Args: Record<PropertyKey, never>; Returns: AppRole };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_approved: { Args: Record<PropertyKey, never>; Returns: boolean };
      can_access_system: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      app_role: AppRole;
      machine_status: MachineStatus;
      alarm_status: AlarmStatus;
      maintenance_status: MaintenanceStatus;
      maintenance_priority: MaintenancePriority;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
