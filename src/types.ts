export interface Device {
  id: string;
  name: string;
  status: string;
  assetNumber?: string;
  serialNumber?: string;
  uid?: string;
  type?: string;
  [key: string]: any;
}

export interface GetDevicesParams {
  limit?: number;
  cursor?: string;
  locale: string;
  type?: string;
  status?: string;
  assetNumber?: string;
  serialNumber?: string;
  uid?: string;
}

export interface GetDevicesResponse {
  devices: Device[];
  nextCursor?: string;
}
