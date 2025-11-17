import api from "@/libs/api";

export type CommunityPost = {
  post_id: number;
  user_id: number;
  username?: string | null;
  content: string;
  visibility: string;
  created_at: string;
};

export type PostComment = {
  comment_id: number;
  post_id: number;
  user_id: number;
  username?: string | null;
  content: string;
  created_at: string;
};

export type ReactionSummary = {
  reaction_type: string;
  count: number;
};

export type PostReaction = {
  post_id: number;
  user_id: number;
  reaction_type: string;
  created_at: string;
};

export type FeedPost = CommunityPost & {
  comments: PostComment[];
  reactions: Record<string, number>;
  viewerReaction?: string | null;
};

export const REACTION_OPTIONS: { type: string; label: string; emoji: string }[] = [
  { type: "like", label: "Like", emoji: "👍" },
  { type: "celebrate", label: "Celebrate", emoji: "🎉" },
  { type: "support", label: "Support", emoji: "❤️" },
  { type: "fire", label: "Fire", emoji: "🔥" },
];

export const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "followers", label: "Followers only" },
];

export const formatRelative = (iso: string) => {
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);

  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let duration = diffSec;
  for (const [amount, unit] of divisions) {
    if (Math.abs(duration) < amount) {
      return formatter.format(Math.round(duration), unit);
    }
    duration /= amount;
  }
  return "some time ago";
};

const ensureUtc = (iso: string) => {
  if (!iso) return iso;

  const trimmed = iso.trim();
  const hasTimezoneOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  if (hasTimezoneOffset) {
    return trimmed;
  }
  return `${trimmed.replace(" ", "T")}Z`;
};

export const formatFullDate = (iso: string) => {
  const normalized = ensureUtc(iso);
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
};

const emptyReactionMap = () =>
  REACTION_OPTIONS.reduce<Record<string, number>>((acc, option) => {
    acc[option.type] = 0;
    return acc;
  }, {});

export const buildReactionMap = (summary: ReactionSummary[]) => {
  const map = emptyReactionMap();
  summary.forEach((entry) => {
    map[entry.reaction_type] = entry.count;
  });
  return map;
};

type HydrationOptions = {
  userId?: number;
};

const fetchViewerReaction = async (postId: number, userId?: number) => {
  if (!userId) return null;

  try {
    const { data } = await api.get<PostReaction | null>(
      `/api/community/posts/${postId}/reactions/by-user/${userId}`
    );
    if (!data) return null;
    return data.reaction_type;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      (error as { response?: { status?: number } }).response?.status === 404
    ) {
      return null;
    }
    throw error;
  }
};

export const hydratePost = async (
  post: CommunityPost,
  options?: HydrationOptions
): Promise<FeedPost> => {
  const [commentsRes, reactionsRes, viewerReaction] = await Promise.all([
    api.get<PostComment[]>(`/api/community/posts/${post.post_id}/comments`),
    api.get<ReactionSummary[]>(`/api/community/posts/${post.post_id}/reactions`),
    fetchViewerReaction(post.post_id, options?.userId),
  ]);

  return {
    ...post,
    comments: commentsRes.data,
    reactions: buildReactionMap(reactionsRes.data),
    viewerReaction,
  };
};

export const hydratePosts = (rawPosts: CommunityPost[], userId?: number) =>
  Promise.all(rawPosts.map((post) => hydratePost(post, { userId })));

export const fetchPostWithDetails = async (postId: number, userId?: number) => {
  const { data: post } = await api.get<CommunityPost>(`/api/community/posts/${postId}`);
  return hydratePost(post, { userId });
};
