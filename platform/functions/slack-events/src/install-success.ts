import { InstallURLOptions, Installation, OrgInstallation } from '@slack/oauth';
import { IncomingMessage, ServerResponse } from 'http';

function isOrgInstall(installation: Installation): installation is OrgInstallation {
  return installation.isEnterpriseInstall || false;
}

function isNotOrgInstall(installation: Installation): installation is Installation<'v1' | 'v2', false> {
  return !isOrgInstall(installation);
}

export function success(
  installation: Installation | OrgInstallation,
  _options: InstallURLOptions,
  _callbackReq: IncomingMessage,
  callbackRes: ServerResponse
): void {
  let redirectUrl: string;

  if (isNotOrgInstall(installation) && installation.appId !== undefined) {
    // redirect back to Slack native app
    // Changes to the workspace app was installed to, to the app home
    redirectUrl = `slack://app?team=${installation.team.id}&id=${installation.appId}`;
  } else if (isOrgInstall(installation)) {
    // redirect to Slack app management dashboard
    redirectUrl = `${installation.enterpriseUrl}manage/organization/apps/profile/${installation.appId}/workspaces/add`;
  } else {
    // redirect back to Slack native app
    // does not change the workspace the slack client was last in
    redirectUrl = 'slack://open';
  }
  let browserUrl = redirectUrl;
  if (isNotOrgInstall(installation)) {
    browserUrl = `https://app.slack.com/client/${installation.team.id}/${installation.appId}`;
  }
  callbackRes.setHeader('Location', browserUrl);
  callbackRes.writeHead(302);
  callbackRes.end('');
}
