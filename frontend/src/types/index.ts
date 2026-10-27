export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
}

export interface Document {
  id: number;
  name: string;
  description?: string;
  folder_name: string;
  tags: string[];
  status: "uploading" | "processing" | "completed" | "failed";
  status_label: string;
  file_type: string;
  error_message?: string;
  total_pages: number;
  created_at: string;
}

export interface DocumentDetail extends Document {
  slides: SlideInfo[];
}

export interface SlideInfo {
  id: number;
  page_number: number;
  chapter?: string;
  image_url?: string;
}

export interface FolderInfo {
  folder_name: string;
  document_count: number;
}

export interface TagInfo {
  tag: string;
  document_count: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  related_slides?: SlideInfo[];
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  course_name: string;
  course_id?: number;
  messages: ChatMessage[];
  created_at: Date;
}
