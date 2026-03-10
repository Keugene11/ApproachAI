"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import PostCard from "@/components/PostCard";

type SortMode = "new" | "top";

const PAGE_SIZE = 20;

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<SortMode>("new");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const supabase = createClient();

  const fetchPosts = async (mode: SortMode, offset = 0) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const order = mode === "top" ? "score" : "created_at";
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order(order, { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const postList = data || [];

    if (postList.length > 0) {
      const ids = postList.map((p: any) => p.id);
      const { data: userVotes } = await supabase
        .from("votes")
        .select("post_id, direction")
        .eq("user_id", user.id)
        .in("post_id", ids);

      const voteMap: Record<string, number> = {};
      userVotes?.forEach((v: any) => { voteMap[v.post_id] = v.direction; });

      if (offset === 0) {
        setPosts(postList);
        setVotes(voteMap);
      } else {
        setPosts((prev) => [...prev, ...postList]);
        setVotes((prev) => ({ ...prev, ...voteMap }));
      }
    } else if (offset === 0) {
      setPosts([]);
    }

    setHasMore(postList.length === PAGE_SIZE);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts(sort);
  }, [sort]);

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 pt-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 -ml-1 press">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <h1 className="font-display text-[20px] font-bold tracking-tight">Community</h1>
        </div>
        <Link
          href="/community/new"
          className="h-9 px-3.5 rounded-full bg-[#1a1a1a] text-white flex items-center gap-1.5 press text-[13px] font-medium"
        >
          <Plus size={14} strokeWidth={2} />
          Post
        </Link>
      </div>

      {/* Sort toggle */}
      <div className="flex gap-1 mb-5 bg-bg-card border border-border rounded-full p-1 w-fit">
        {(["new", "top"] as SortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => { setLoading(true); setSort(mode); }}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              sort === mode ? "bg-[#1a1a1a] text-white" : "text-text-muted"
            }`}
          >
            {mode === "new" ? "New" : "Top"}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="text-center text-text-muted text-[14px] py-20">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-muted text-[15px] mb-4">No posts yet.</p>
          <Link
            href="/community/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1a1a1a] text-white text-[14px] font-medium press"
          >
            <Plus size={14} strokeWidth={2} />
            Be the first to share
          </Link>
        </div>
      ) : (
        <div className="space-y-3 stagger">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              body={post.body}
              authorName={post.author_name}
              score={post.score}
              commentCount={post.comment_count}
              createdAt={post.created_at}
              userId={post.user_id}
              currentUserId={userId}
              currentVote={votes[post.id] ?? null}
            />
          ))}

          {hasMore && (
            <button
              onClick={() => fetchPosts(sort, posts.length)}
              className="w-full py-3 text-center text-[14px] text-text-muted font-medium press"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </main>
  );
}
