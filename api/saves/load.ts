import { createPostgresSaveRepository } from '../_lib/db.js';
import {
  getClientKey,
  sendError,
  sendMethodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/http.js';
import { readSave } from '../_lib/saveCore.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '600kb',
    },
  },
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    return sendMethodNotAllowed(response, ['POST']);
  }

  try {
    const body = request.body as Record<string, unknown> | undefined;
    const result = await readSave(
      createPostgresSaveRepository(),
      body?.saveKey,
      body?.pin,
      getClientKey(request),
    );
    return response.status(200).json(result);
  } catch (error) {
    return sendError(response, error);
  }
}
