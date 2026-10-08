import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { Project } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private api = inject(ApiService);

  getProjects(all = false): Observable<ApiResponse<Project[]>> {
    return this.api.get<Project[]>('/projects', { all }, false);
  }

  getProjectBySlug(slug: string): Observable<ApiResponse<Project>> {
    return this.api.get<Project>(`/projects/${encodeURIComponent(slug)}`, undefined, false);
  }

  createProject(data: Partial<Project>): Observable<ApiResponse<Project>> {
    return this.api.post<Project>('/projects', data);
  }

  updateProject(id: string, data: Partial<Project>): Observable<ApiResponse<Project>> {
    return this.api.put<Project>(`/projects/${id}`, data);
  }

  toggleProject(id: string, currentActive: boolean): Observable<ApiResponse<Project>> {
    return this.api.put<Project>(`/projects/${id}`, { isActive: !currentActive });
  }

  deleteProject(id: string): Observable<ApiResponse<Project>> {
    return this.api.delete<Project>(`/projects/${id}`);
  }
}
