import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('adavi_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl?: string | null;
  price: string;
  isFree: boolean;
  level: string;
  avgRating: string;
  totalStudents: number;
  category?: { name: string };
  instructor?: { profile?: { firstName: string; lastName: string } };
}
