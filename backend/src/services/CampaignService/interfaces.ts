export interface CampaignData {
  id: number;
  name?: string;
  status?: string;
  confirmation?: boolean;
  scheduledAt?: Date;
  companyId: number;
  contactListId?: number;
  fileListId?: number;
  body?: string;
  start?: string;
  end?: string;
  whatsappId?: number;
}

export interface Data {
  id?: string;
  name: string;
  status: string;
  confirmation: boolean;
  scheduledAt: Date;
  companyId: number;
  contactListId: number;
  fileListId?: number;
  body: string;
  start: string;
  end: string;
  whatsappId?: number;
}
