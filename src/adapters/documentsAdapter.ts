import { legalConfig } from "@/config/legalConfig";

export interface DocumentMeta {
  docId: string;
  caseId: string;
  type: string;
  name: string;
  version: number;
  uploadedBy: string;
  uploadedOn: string;
  linkedEntities?: string[];
  confidential: boolean;
  checksum?: string;
  size?: number;
  url?: string;
}

export interface ShareLink {
  shareId: string;
  docId: string;
  url: string;
  expiry: string;
  watermark: string;
  accessCount: number;
}

const mockDocs: DocumentMeta[] = [];

export const documentsAdapter = {
  async upload(data: { file: File; meta: Partial<DocumentMeta> }): Promise<DocumentMeta> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 200));
      const doc: DocumentMeta = {
        docId: `DOC-${Date.now()}`,
        caseId: data.meta.caseId || "",
        type: data.meta.type || "Other",
        name: data.file.name,
        version: 1,
        uploadedBy: "current-user",
        uploadedOn: new Date().toISOString(),
        confidential: data.meta.confidential || false,
        size: data.file.size,
        url: URL.createObjectURL(data.file)
      };
      mockDocs.push(doc);
      return doc;
    }
    
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('meta', JSON.stringify(data.meta));
    
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },

  async generateFromTemplate(data: {
    templateId: string;
    mergeData: Record<string, any>;
    caseId: string;
    type: string;
  }): Promise<DocumentMeta> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 300));
      const doc: DocumentMeta = {
        docId: `DOC-${Date.now()}`,
        caseId: data.caseId,
        type: data.type,
        name: `Generated-${data.templateId}-${Date.now()}.pdf`,
        version: 1,
        uploadedBy: "system",
        uploadedOn: new Date().toISOString(),
        confidential: false,
        url: `/mock/generated-${data.templateId}.pdf`
      };
      mockDocs.push(doc);
      return doc;
    }
    
    const response = await fetch('/api/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Generation failed');
    return response.json();
  },

  async get(docId: string): Promise<{ url: string; meta: DocumentMeta }> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 100));
      const doc = mockDocs.find(d => d.docId === docId);
      if (!doc) throw new Error('Document not found');
      return { url: doc.url || "", meta: doc };
    }
    
    const response = await fetch(`/api/documents/${docId}`);
    if (!response.ok) throw new Error('Document not found');
    return response.json();
  },

  async share(data: {
    docId: string;
    expiry: string;
    watermark: string;
  }): Promise<ShareLink> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        shareId: `SHR-${Date.now()}`,
        docId: data.docId,
        url: `/share/${data.docId}?token=${Math.random().toString(36).substr(2)}`,
        expiry: data.expiry,
        watermark: data.watermark,
        accessCount: 0
      };
    }
    
    const response = await fetch('/api/documents/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Share failed');
    return response.json();
  },

  async list(filters: { caseId?: string; type?: string }): Promise<DocumentMeta[]> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 100));
      let results = [...mockDocs];
      if (filters.caseId) results = results.filter(d => d.caseId === filters.caseId);
      if (filters.type) results = results.filter(d => d.type === filters.type);
      return results;
    }
    
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`/api/documents?${params}`);
    if (!response.ok) return [];
    return response.json();
  }
};
