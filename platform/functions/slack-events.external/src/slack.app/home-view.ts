import { HomeView } from '@slack/bolt';
import { getChannels, getUser } from '../apis/mongo-manager';
import { constructHomeView } from '../interactions/home-view.constructor';

export const buildHomeView = async (teamId: string, userId: string): Promise<HomeView> => {
  const user = await getUser({
    teamOrgId: teamId,
    userId: userId,
    population: ['activeChannels']
  });
  const channels = await getChannels({
    teamId: teamId,
    activeBot: true,
    archived: false,
    users: userId,
    projection: {
      _id: false,
      id: true,
      name: true
    }
  });
  return constructHomeView(user, channels);
};
