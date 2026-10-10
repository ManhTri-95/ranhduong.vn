import { AdminTemplate, AdminTemplateResponse, TemplateAnalysis, TemplatePlaceResponse, type TemplateEditInput, type TemplatePlace } from '@ranhduong/contracts';
import { api } from '@/shared/api/client';
export async function fetchTemplates(city: string): Promise<AdminTemplate[]> { return AdminTemplateResponse.parse(await api(`/admin/cities/${city}/itineraries/templates`)).items; }
export async function fetchTemplate(id: string): Promise<AdminTemplate> { return AdminTemplate.parse(await api(`/admin/itineraries/templates/${id}`)); }
export async function fetchTemplatePlaces(city: string): Promise<TemplatePlace[]> { return TemplatePlaceResponse.parse(await api(`/admin/cities/${city}/template-places`)).items; }
export async function createTemplate(city: string, input: TemplateEditInput): Promise<AdminTemplate> { return AdminTemplate.parse(await api(`/admin/cities/${city}/itineraries/templates`, { method: 'POST', body: input })); }
export async function updateTemplate(id: string, input: TemplateEditInput): Promise<AdminTemplate> { return AdminTemplate.parse(await api(`/admin/itineraries/templates/${id}`, { method: 'PUT', body: input })); }
export async function previewTemplate(city: string, input: TemplateEditInput): Promise<TemplateAnalysis> { return TemplateAnalysis.parse(await api(`/admin/cities/${city}/itineraries/templates/preview`, { method: 'POST', body: input })); }
