import { UserGetRequest, UserUpdateLabelsRequest } from '@hypsibius/message-types';
import { User } from '@hypsibius/message-types/mongo';
import axios, { AxiosResponse } from 'axios';

const userManagerServiceURL: string =
  process.env.USER_MANAGER_SVC_URL || 'http://slack-mongo-user-manager.mongodb.svc.cluster.local';

type UserManagerOptions = {
  userManagerServiceURL?: string;
};

export const getUser = async (req: Omit<UserGetRequest, 'type'>, options?: UserManagerOptions): Promise<User> => {
  const res = await axios.post<User | string, AxiosResponse<User | string, UserGetRequest>, UserGetRequest>(
    options?.userManagerServiceURL ?? userManagerServiceURL,
    {
      ...req,
      type: 'get'
    }
  );
  if (res.status > 299 || typeof res.data === 'string') {
    throw Error(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
  }
  return res.data;
};

export const updateLabels = async (req: Omit<UserUpdateLabelsRequest, 'type'>, options?: UserManagerOptions): Promise<User> => {
    const res = await axios.post<User | string, AxiosResponse<User | string, UserGetRequest>, UserUpdateLabelsRequest>(
      options?.userManagerServiceURL ?? userManagerServiceURL,
      {
        ...req,
        type: 'update'
      }
    );
    if (res.status > 299 || typeof res.data === 'string') {
      throw Error(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
    }
    return res.data;
  };
