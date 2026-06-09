export type BackendIdentity = {
  privyUserId: string;
  walletAddress: string;
};

export function getIdentityFromHeaders(headers: Headers): BackendIdentity | null {
  const privyUserId = headers.get("x-privy-user-id") || "";
  const walletAddress = headers.get("x-wallet-address") || "";
  if (!privyUserId || !walletAddress) return null;
  return { privyUserId, walletAddress };
}
