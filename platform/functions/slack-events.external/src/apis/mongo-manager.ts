import { ChannelGetRequest, UserGetRequest, UserUpdateLabelsRequest } from '@hypsibius/message-types';
import { Channel, User } from '@hypsibius/message-types/mongo';
import axios, { AxiosResponse } from 'axios';

const userManagerServiceURL: string =
  process.env.MONGO_MANAGER_SVC_URL || 'http://mongo-manager.mongodb.svc.cluster.local';

type MongoManagerOptions = {
  userManagerServiceURL?: string;
};

export const getChannels = async (
  req: Omit<ChannelGetRequest, 'type' | 'schema'>,
  options?: MongoManagerOptions
): Promise<Channel[]> => {
  const res = await axios.post<
    Channel[] | string,
    AxiosResponse<Channel[] | string, ChannelGetRequest>,
    ChannelGetRequest
  >(options?.userManagerServiceURL ?? userManagerServiceURL, {
    ...req,
    type: 'get',
    schema: 'Channel'
  });
  if (res.status > 299 || typeof res.data === 'string') {
    throw Error(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
  }
  return res.data;
};

export const getUser = async (
  req: Omit<UserGetRequest, 'type' | 'schema'>,
  options?: MongoManagerOptions
): Promise<User> => {
  const res = await axios.post<User | string, AxiosResponse<User | string, UserGetRequest>, UserGetRequest>(
    options?.userManagerServiceURL ?? userManagerServiceURL,
    {
      ...req,
      type: 'get',
      schema: 'User'
    }
  );
  if (res.status > 299 || typeof res.data === 'string') {
    throw Error(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
  }
  return res.data;
};

export const updateLabels = async (
  req: Omit<UserUpdateLabelsRequest, 'type' | 'schema'>,
  options?: MongoManagerOptions
): Promise<User> => {
  const res = await axios.post<User | string, AxiosResponse<User | string, UserGetRequest>, UserUpdateLabelsRequest>(
    options?.userManagerServiceURL ?? userManagerServiceURL,
    {
      ...req,
      type: 'update',
      schema: 'User'
    }
  );
  if (res.status > 299 || typeof res.data === 'string') {
    throw Error(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
  }
  return res.data;
};
