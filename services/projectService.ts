import type { Project } from "@/types";
import projectsData from "@/mock-data/projects.json";

const projects = projectsData as Project[];

export const projectService = {
  async list(): Promise<Project[]> {
    return projects;
  },

  async getById(id: string): Promise<Project | null> {
    return projects.find((p) => p.id === id) ?? null;
  },

  async getByBuilderId(builderId: string): Promise<Project[]> {
    return projects.filter((p) => p.builderId === builderId);
  },

  async filterLogsByDateRange(
    project: Project,
    start: string,
    end: string
  ): Promise<Project["dailyLogs"]> {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return project.dailyLogs.filter((log) => {
      const logTime = new Date(log.date).getTime();
      return logTime >= startTime && logTime <= endTime;
    });
  },
};
