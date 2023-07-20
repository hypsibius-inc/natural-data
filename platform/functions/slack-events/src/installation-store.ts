import { SlackLogger } from '@hypsibius/knative-faas-utils';
import { InstallationRequest } from '@hypsibius/message-types';
import { type Installation } from '@hypsibius/message-types/mongo';
import { Installation as InstallationInterface, InstallationQuery } from '@slack/bolt';
import axios, { AxiosResponse } from 'axios';

export const getInstallationStore = (installationServiceURL: string, logger: SlackLogger) => ({
  storeInstallation: async (installation: InstallationInterface): Promise<void> => {
    let id: string;
    if (installation.isEnterpriseInstall) {
      // support for org wide app installation
      id = installation.enterprise?.id!;
    } else {
      // single team app installation
      id = installation.team?.id!;
    }
    const res = await axios.post<Installation, AxiosResponse<Installation, InstallationRequest>, InstallationRequest>(
      installationServiceURL,
      { type: 'set', id: id, payload: installation }
    );
    if (res.status > 299) {
      throw Error(`${res.data}`);
    }
  },
  fetchInstallation: async <T extends boolean>(installQuery: InstallationQuery<T>): Promise<InstallationInterface> => {
    const id: string | null =
      installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined
        ? installQuery.enterpriseId
        : installQuery.teamId !== undefined
        ? installQuery.teamId
        : null;
    if (id === null) {
      throw Error('No ID given with which to fetch');
    }
    const res = await axios.post<Installation, AxiosResponse<Installation, InstallationRequest>, InstallationRequest>(
      installationServiceURL,
      { type: 'get', id: id }
    );
    if (res.status > 299) {
      throw Error(`${res.data}`);
    }
    logger.debug(`Fetched Installation ${JSON.stringify(res.data)}`);
    return res.data.payload;
  },
  deleteInstallation: async <T extends boolean>(installQuery: InstallationQuery<T>): Promise<void> => {
    const id: string | null =
      installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined
        ? installQuery.enterpriseId
        : installQuery.teamId !== undefined
        ? installQuery.teamId
        : null;
    if (id === null) {
      throw Error('No ID given to delete');
    }
    const res = await axios.post<string, AxiosResponse<string, InstallationRequest>, InstallationRequest>(
      installationServiceURL,
      { type: 'get', id: id }
    );
    if (res.status > 299) {
      throw Error(`${res.data}`);
    }
  }
});
