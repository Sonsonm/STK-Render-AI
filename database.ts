/**
 * Tipos das tabelas do Supabase (Fase 1 / MVP).
 *
 * Estes tipos são escritos manualmente na Sprint 0 para destravar o
 * desenvolvimento. Recomenda-se substituir/sincronizar via:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 *
 * assim que o projeto Supabase remoto estiver criado.
 */

export type ProjectStatus =
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "approved"
  | "prompt_ready"
  | "error";

export type FileType = "jpg" | "jpeg" | "png" | "pdf" | "ifc" | "dwg";

export type StructureType = "metalica" | "concreto" | "mista";

export type JobType = "parse_file" | "analyze" | "structure_json" | "build_prompt";
export type JobStatus = "pending" | "processing" | "done" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };

      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          status: ProjectStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          status?: ProjectStatus;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };

      project_files: {
        Row: {
          id: string;
          project_id: string;
          file_type: FileType;
          storage_path: string;
          original_filename: string;
          size_bytes: number | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          file_type: FileType;
          storage_path: string;
          original_filename: string;
          size_bytes?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["project_files"]["Insert"]>;
      };

      technical_analysis: {
        Row: {
          id: string;
          project_id: string;
          raw_report: string;
          structured_json: Record<string, unknown>;
          structure_type: StructureType | null;
          analysis_provider_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          raw_report: string;
          structured_json: Record<string, unknown>;
          structure_type?: StructureType | null;
          analysis_provider_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["technical_analysis"]["Insert"]>;
      };

      prompts: {
        Row: {
          id: string;
          project_id: string;
          structured_json_snapshot: Record<string, unknown>;
          scenario_variant_used: Record<string, unknown>;
          final_prompt: string;
          model_used: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          structured_json_snapshot: Record<string, unknown>;
          scenario_variant_used: Record<string, unknown>;
          final_prompt: string;
          model_used?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["prompts"]["Insert"]>;
      };

      jobs: {
        Row: {
          id: string;
          project_id: string;
          job_type: JobType;
          status: JobStatus;
          payload: Record<string, unknown>;
          result: Record<string, unknown> | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          job_type: JobType;
          status?: JobStatus;
          payload?: Record<string, unknown>;
          result?: Record<string, unknown> | null;
          error_message?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Insert"]>;
      };

      ai_providers: {
        Row: {
          id: string;
          provider_key: string;
          category: "analysis" | "render";
          display_name: string;
          capabilities: string[];
          cost_tier: "low" | "medium" | "high";
          cost_per_unit: number | null;
          cost_unit: string | null;
          max_resolution: string | null;
          active: boolean;
          priority: number;
          config: Record<string, unknown>;
          fallback_provider_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_providers"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["ai_providers"]["Row"]>;
      };

      provider_routing_rules: {
        Row: {
          id: string;
          pipeline_stage: string;
          primary_provider_id: string;
          fallback_provider_id: string | null;
          fallback_provider_2_id: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["provider_routing_rules"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["provider_routing_rules"]["Row"]>;
      };

      scenario_library: {
        Row: {
          id: string;
          context_type: string;
          name: string;
          active: boolean;
          version: number;
          description: string | null;
          data: Record<string, unknown>;
          weight: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["scenario_library"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["scenario_library"]["Row"]>;
      };
    };
  };
}
