import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AdminaApiClient } from './admina-api';
import { GetDevicesParams } from './types';

dotenv.config();

const organizationId = process.env.ORGANIZATION_ID;
const apiKey = process.env.API_KEY;
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

if (!organizationId || !apiKey) {
  console.error('Error: ORGANIZATION_ID and API_KEY environment variables must be set');
  process.exit(1);
}

const adminaClient = new AdminaApiClient(organizationId, apiKey);

const app = express();

app.use(cors());
app.use(express.json());

const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const [providedOrgId, providedApiKey] = token.split(':');
  
  if (providedOrgId === organizationId && providedApiKey === apiKey) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
  }
};

app.get('/', (req, res) => {
  res.json({
    name: 'Admina MCP Server',
    description: 'MCP server for Admina API integration',
    version: '1.0.0',
    tools: [
      {
        name: 'get_devices',
        description: 'Return a list of devices with localized values filterable by status, asset number, serial number, and uid',
        parameters: [
          {
            name: 'limit',
            description: 'Limit the number of results returned',
            type: 'number',
            required: false
          },
          {
            name: 'cursor',
            description: 'Cursor to paginate through results',
            type: 'string',
            required: false
          },
          {
            name: 'locale',
            description: 'Translate the field names and labels to the specified locale',
            type: 'string',
            required: true,
            default: 'en'
          },
          {
            name: 'type',
            description: 'Filter by device type',
            type: 'string',
            required: false
          },
          {
            name: 'status',
            description: 'Filter by device status',
            type: 'string',
            required: false
          },
          {
            name: 'asset_number',
            description: 'Filter by asset number',
            type: 'string',
            required: false
          },
          {
            name: 'serial_number',
            description: 'Filter by serial number',
            type: 'string',
            required: false
          },
          {
            name: 'uid',
            description: 'Filter by uid (or peopleId)',
            type: 'string',
            required: false
          }
        ]
      }
    ]
  });
});

app.post('/tools/get_devices', authenticate as express.RequestHandler, async (req, res) => {
  try {
    const params = req.body.params || {};
    
    const apiParams: GetDevicesParams = {
      limit: params.limit,
      cursor: params.cursor,
      locale: params.locale || 'en',
      type: params.type,
      status: params.status,
      assetNumber: params.asset_number,
      serialNumber: params.serial_number,
      uid: params.uid
    };

    const result = await adminaClient.getDevices(apiParams);
    res.json({ result });
  } catch (error) {
    console.error('Error in get_devices tool:', error);
    res.status(500).json({ 
      error: {
        message: `Failed to fetch devices: ${error instanceof Error ? error.message : String(error)}`
      }
    });
  }
});

app.listen(port, () => {
  console.log(`Admina MCP Server is running on port ${port}`);
});
