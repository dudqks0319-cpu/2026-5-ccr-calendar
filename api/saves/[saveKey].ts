import { createPostgresSaveRepository } from '../_lib/db.js';
import {
  getQueryString,
  sendError,
  sendMethodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/http.js';
import { getServerSaveMaxBytes, readSave, updateSave } from '../_lib/saveCore.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '600kb',
    },
  },
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const saveKey = getQueryString(request.query?.saveKey) || getSaveKeyFromUrl(request.url || '');
  const repository = createPostgresSaveRepository();

  try {
    if (request.method === 'GET') {
      const result = await readSave(repository, saveKey, getQueryString(request.query?.pin));
      return response.status(200).json(result);
    }

    if (request.method === 'PUT') {
      const result = await updateSave(
        repository,
        saveKey,
        request.body,
        getServerSaveMaxBytes(),
      );
      return response.status(200).json(result);
    }

    return sendMethodNotAllowed(response, ['GET', 'PUT']);
  } catch (error) {
    return sendError(response, error);
  }
}

function getSaveKeyFromUrl(url: string) {
  const pathname = url.split('?')[0] || '';
  const rawValue = pathname.split('/').filter(Boolean).pop() || '';
  return decodeURIComponent(rawValue);
}
