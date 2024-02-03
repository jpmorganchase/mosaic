import proxyAgentPkg from 'https-proxy-agent';

const { HttpsProxyAgent } = proxyAgentPkg;

export function createProxyAgent(proxyUrl: string) {
  return new HttpsProxyAgent(proxyUrl);
}
