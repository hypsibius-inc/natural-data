import {
  TextClassificationAlteredResponse,
  TextClassificationRequest,
  TextClassificationResponse,
  getAlteredResponse
} from '@hypsibius/message-types/ai';
import axios, { AxiosResponse } from 'axios';

const textClassificationServiceURL: string =
  process.env.MONGO_MANAGER_SVC_URL || 'http://text-classification.ai.svc.cluster.local';

type TextClassificationOptions = {
  textClassificationServiceURL?: string;
};
export const getClassifications = async (
  req: TextClassificationRequest,
  options?: TextClassificationOptions
): Promise<TextClassificationAlteredResponse> => {
  const res = await axios.post<
    TextClassificationResponse | string,
    AxiosResponse<TextClassificationResponse | string, TextClassificationRequest>,
    TextClassificationRequest
  >(options?.textClassificationServiceURL ?? textClassificationServiceURL, req);
  if (res.status > 299 || typeof res.data === 'string') {
    throw Error(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
  }
  return getAlteredResponse(res.data, req.zero_shot_labels);
};
