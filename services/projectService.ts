import type { Project } from "@/types";
import { fetchCollection, fetchDocument, createDocument, updateDocument, deleteDocument } from "@/lib/api-client";

export const projectService = {
  async list(): Promise<Project[]> {
    return fetchCollection<Project>("projects");
  },

  async getById(id: string): Promise<Project | null> {
    return fetchDocument<Project>("projects", id);
  },

  async create(input: Partial<Project>): Promise<Project> {
    return createDocument<Project>("projects", input);
  },

  async update(id: string, partial: Partial<Project>): Promise<Project> {
    return updateDocument<Project>("projects", id, partial);
  },

  async remove(id: string): Promise<void> {
    return deleteDocument("projects", id);
  },
};
