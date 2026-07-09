export interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  clientType: "individual" | "corporate" | "government";
}
