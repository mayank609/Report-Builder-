import type { GstBranch } from "./gst";

export interface Builder {
  id: string;
  name: string;
  companyName: string;
  licenseNumber: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  logoUrl: string;
  establishedYear: number;
  specialization: string[];
  pan?: string;
  gstBranches: GstBranch[];
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    branch: string;
  };
}
