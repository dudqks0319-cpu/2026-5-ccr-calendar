import { createPostgresSaveRepository } from '../_lib/db.js';
import {
  getClientKey,
  getQueryString,
  sendError,
  sendMethodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/http.js';
import { ApiError, getServerSaveMaxBytes, readSave, updateSave } from '../_lib/saveCore.js';

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
      if (getQueryString(request.query?.pin)) {
        throw new ApiError(400, 'PIN은 URL이 아니라 서버 불러오기 입력창으로 보내야 합니다.');
      }
      const result = await readSave(repository, saveKey, undefined, getClientKey(request));
      return response.status(200).json(result);
    }

    if (request.method === 'PUT') {
      const result = await updateSave(
        repository,
        saveKey,
        request.body,
        getServerSaveMaxBytes(),
        getClientKey(request),
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
