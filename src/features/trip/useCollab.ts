"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { useTripChanges } from "@/lib/realtime";

export interface PointComment {
  id: string;
  point_id: string;
  author: string;
  body: string;
  created_at: string;
}
interface PointVote {
  point_id: string;
  voter: string;
}

/**
 * 동행 의견: 장소별 좋아요·댓글과 "내 이름".
 * 공유 링크에는 계정이 없어서 이름은 이 기기에 기억한다 (여행마다). 고른 이름으로 좋아요·댓글을 남긴다.
 */
export function useCollab(tripId: string) {
  const [comments, setComments] = useState<PointComment[]>([]);
  const [votes, setVotes] = useState<PointVote[]>([]);
  const load = useCallback(() => {
    apiGet<PointComment[]>(`/api/point-comments?trip_id=${tripId}`).then(setComments).catch(() => {});
    apiGet<PointVote[]>(`/api/point-votes?trip_id=${tripId}`).then(setVotes).catch(() => {});
  }, [tripId]);
  useEffect(() => {
    load();
  }, [load]);
  useTripChanges(tripId, ["point_comments", "point_votes"], load);

  const key = `triplan:me:${tripId}`;
  // ponytail: 서버 렌더는 로딩 화면만 그리므로 첫 값을 바로 localStorage 에서 읽어도 어긋나지 않는다 (지도 크게 보기와 같음)
  const [me, setMeState] = useState<string | null>(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  });
  function setMe(name: string) {
    setMeState(name);
    try {
      localStorage.setItem(key, name);
    } catch {}
  }

  const byPoint = useMemo(() => {
    const out: Record<string, { voters: string[]; comments: PointComment[] }> = {};
    const at = (id: string) => (out[id] ??= { voters: [], comments: [] });
    for (const v of votes) at(v.point_id).voters.push(v.voter);
    for (const c of comments) at(c.point_id).comments.push(c);
    return out;
  }, [votes, comments]);

  async function toggleVote(pointId: string, name: string) {
    const on = !votes.some((v) => v.point_id === pointId && v.voter === name);
    setVotes((prev) => (on ? [...prev, { point_id: pointId, voter: name }] : prev.filter((v) => !(v.point_id === pointId && v.voter === name))));
    await apiPost("/api/point-votes", { trip_id: tripId, point_id: pointId, voter: name, on }).catch(load);
  }
  async function addComment(pointId: string, author: string, body: string) {
    const c = await apiPost<PointComment>("/api/point-comments", { trip_id: tripId, point_id: pointId, author, body });
    setComments((prev) => [...prev, c]);
  }
  async function deleteComment(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    await apiDelete(`/api/point-comments/${id}`).catch(load);
  }

  return { byPoint, me, setMe, toggleVote, addComment, deleteComment };
}

export type Collab = ReturnType<typeof useCollab>;
