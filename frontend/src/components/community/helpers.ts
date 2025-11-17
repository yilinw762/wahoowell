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

export type FeedPost = CommunityPost & {
  comments: PostComment[];
  reactions: Record<string, number>;
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

export const hydratePost = async (post: CommunityPost): Promise<FeedPost> => {
  const [commentsRes, reactionsRes] = await Promise.all([
    api.get<PostComment[]>(`/api/community/posts/${post.post_id}/comments`),
    api.get<ReactionSummary[]>(`/api/community/posts/${post.post_id}/reactions`),
  ]);

  return {
    ...post,
    comments: commentsRes.data,
    reactions: buildReactionMap(reactionsRes.data),
  };
};

export const hydratePosts = (rawPosts: CommunityPost[]) =>
  Promise.all(rawPosts.map((post) => hydratePost(post)));

export const fetchPostWithDetails = async (postId: number) => {
  const { data: post } = await api.get<CommunityPost>(`/api/community/posts/${postId}`);
  return hydratePost(post);
};
