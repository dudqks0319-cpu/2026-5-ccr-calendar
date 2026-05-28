import { createPostgresSaveRepository } from '../_lib/db.js';
import { sendError, sendMethodNotAllowed, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { createSave, getServerSaveMaxBytes } from '../_lib/saveCore.js';

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
    const result = await createSave(
      createPostgresSaveRepository(),
      request.body,
      getServerSaveMaxBytes(),
    );
    return response.status(201).json(result);
  } catch (error) {
    return sendError(response, error);
  }
}
