import axios from 'axios';
import { GetDevicesParams, GetDevicesResponse } from './types';

export class AdminaApiClient {
  private baseUrl: string;
  private organizationId: string;
  private apiKey: string;

  constructor(organizationId: string, apiKey: string) {
    this.baseUrl = 'https://api.itmc.i.moneyforward.com/api/v1';
    this.organizationId = organizationId;
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  async getDevices(params: GetDevicesParams): Promise<GetDevicesResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/organizations/${this.organizationId}/devices`,
        {
          headers: this.getHeaders(),
          params
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }
}
