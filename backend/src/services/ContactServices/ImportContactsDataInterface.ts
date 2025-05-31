export interface ImportContactsData {
  name: string;
  contacts: Array<{
    name: string;
    number: string;
    email?: string;
    condominio?: string;
    endereco?: string;
    cargo?: string;
  }>;
  companyId: number;
}
