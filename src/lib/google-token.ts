// run two functions here = getGoogleTOken, refreshGoogle Token

import { prisma } from "./db";

export const getGoogleToken = async ({ userId }: { userId: string }) => {
  const account = await prisma.account.findFirst({
    where: {
      userId: userId,
      providerId: "google",
    },
  });

  if (!account) throw new Error("No Google account linked for this user");

  const isExpired =
    account.accessTokenExpiresAt &&
    account.accessTokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired) {
    if (!account.refreshToken) throw new Error("No refresh token available, Please Refresh this page again or login again");
    return await refreshGoogleToken(account.id, account.refreshToken);
  }

  return account.accessToken;
};

export const refreshGoogleToken = async (
  accountId: string,
  refreshToken: string,
) => {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) throw new Error("Failed to refresh Google token");

  const { access_token, expires_in } = await response.json();

  const updatedAccount = await prisma.account.update({
    where: { id: accountId },
    data: {
      accessToken: access_token,
      accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
    },
  });

  return updatedAccount.accessToken;
};
