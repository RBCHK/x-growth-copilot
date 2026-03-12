/**
 * X (Twitter) API v2 client with OAuth 1.0a authentication
 * Single-user setup: credentials stored in .env.local
 */

import crypto from 'crypto';

const BASE_URL = 'https://api.twitter.com/2';

export interface XTweetMetrics {
  postId: string;
  createdAt: Date;
  text: string;
  postLink: string;
  impressions: number;
  likes: number;
  engagements: number;
  bookmarks: number;
  shares: number;
  replies: number;
  reposts: number;
  urlClicks: number;
}

export interface XUserData {
  followersCount: number;
  followingCount: number;
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  oauthParams: Record<string, string>
): string {
  const allParams = { ...params, ...oauthParams };
  const paramString = Object.entries(allParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join('&');

  const signingKey = [
    encodeURIComponent(process.env.X_CONSUMER_KEY_SECRET ?? ''),
    encodeURIComponent(process.env.X_ACCESS_TOKEN_SECRET ?? ''),
  ].join('&');

  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function buildAuthHeader(method: string, url: string, params: Record<string, string>): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: process.env.X_CONSUMER_KEY ?? '',
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: process.env.X_ACCESS_TOKEN ?? '',
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature(method, url, params, oauthParams);

  const headerParts = { ...oauthParams, oauth_signature: signature };
  const headerStr = Object.entries(headerParts)
    .map(([k, v]) => `${k}="${encodeURIComponent(v)}"`)
    .join(', ');

  return `OAuth ${headerStr}`;
}

async function xFetch<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const qs = new URLSearchParams(params).toString();
  const authHeader = buildAuthHeader('GET', url, params);

  const res = await fetch(`${url}?${qs}`, {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API ${res.status} ${res.statusText}: ${body}`);
  }

  return res.json() as Promise<T>;
}

/** Fetch current user's ID (needed for /users/:id/tweets) */
export async function fetchCurrentUserId(): Promise<string> {
  const data = await xFetch<{ data: { id: string } }>('/users/me', {});
  return data.data.id;
}

/** Fetch current user's followers/following count */
export async function fetchUserData(): Promise<XUserData> {
  const data = await xFetch<{
    data: { public_metrics: { followers_count: number; following_count: number } };
  }>('/users/me', { 'user.fields': 'public_metrics' });

  return {
    followersCount: data.data.public_metrics.followers_count,
    followingCount: data.data.public_metrics.following_count,
  };
}

/** Fetch user's own tweets with public + non-public metrics */
export async function fetchUserTweets(
  userId: string,
  maxResults = 100,
  sinceId?: string
): Promise<XTweetMetrics[]> {
  const params: Record<string, string> = {
    max_results: Math.min(maxResults, 100).toString(),
    'tweet.fields': 'created_at,public_metrics,non_public_metrics',
  };
  if (sinceId) params.since_id = sinceId;

  const data = await xFetch<{
    data?: Array<{
      id: string;
      text: string;
      created_at: string;
      public_metrics: {
        like_count: number;
        reply_count: number;
        retweet_count: number;
        bookmark_count: number;
        impression_count?: number;
      };
      non_public_metrics?: {
        impression_count: number;
        url_clicks: number;
      };
    }>;
  }>(`/users/${userId}/tweets`, params);

  if (!data.data?.length) return [];

  return data.data.map((tweet) => {
    const pub = tweet.public_metrics;
    const priv = tweet.non_public_metrics;

    const impressions = priv?.impression_count ?? pub.impression_count ?? 0;
    const urlClicks = priv?.url_clicks ?? 0;
    const engagements = pub.like_count + pub.reply_count + pub.retweet_count + pub.bookmark_count;

    return {
      postId: tweet.id,
      createdAt: new Date(tweet.created_at),
      text: tweet.text,
      postLink: `https://x.com/razRBCHK/status/${tweet.id}`,
      impressions,
      likes: pub.like_count,
      engagements,
      bookmarks: pub.bookmark_count,
      shares: pub.retweet_count,
      replies: pub.reply_count,
      reposts: pub.retweet_count,
      urlClicks,
    };
  });
}
