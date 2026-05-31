"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { UsersIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { createPod, inviteMember, removeMember } from "../actions";

interface Member {
  userId: string;
  name: string;
  role: string;
  isOwner: boolean;
}

const ERROR_LABEL: Record<string, string> = {
  MEMBER_LIMIT: "現在のプランの人数上限に達しています。",
  USER_NOT_FOUND: "そのメールのユーザーが見つかりません（先に登録が必要です）。",
};

export function FamilySharing({
  ledgerId,
  isPod,
  isOwner,
  members,
  maxMembers,
  tier,
}: {
  ledgerId: string;
  isPod: boolean;
  isOwner: boolean;
  members: Member[];
  maxMembers: number;
  tier: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>();
  const [podName, setPodName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");

  function makePod() {
    setMsg(undefined);
    start(async () => {
      const res = await createPod({ name: podName || "共有家計簿" });
      if (res.ok) router.refresh();
      else setMsg(res.error);
    });
  }
  function invite() {
    setMsg(undefined);
    start(async () => {
      const res = await inviteMember({ ledgerId, email, role });
      if (res.ok) {
        setEmail("");
        router.refresh();
      } else setMsg(ERROR_LABEL[res.error] ?? res.error);
    });
  }
  function kick(userId: string) {
    start(async () => {
      await removeMember({ ledgerId, userId });
      router.refresh();
    });
  }

  if (tier === "FREE") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-4">
        <UsersIcon size={22} className="text-pod" />
        <span className="flex-1 text-[14px] text-text-secondary">
          ファミリー共有はプラス以上で利用できます。
        </span>
        <ButtonLink href="/billing" size="sm" variant="tinted">
          アップグレード
        </ButtonLink>
      </div>
    );
  }

  if (!isPod) {
    return (
      <div className="space-y-3">
        <p className="text-[14px] text-text-secondary">
          家族で共有する帳簿を作成すると、誰が・何に・いくら払っているかをまとめて管理できます（最大{maxMembers}人）。
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="共有帳簿の名前"
            value={podName}
            onChange={(e) => setPodName(e.target.value)}
          />
          <Button onClick={makePod} disabled={pending} className="shrink-0">
            <UsersIcon size={18} /> 作成
          </Button>
        </div>
        {msg && <p className="text-[13px] text-expense">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-tertiary">
          メンバー {members.length} / {maxMembers}人
        </span>
        <Badge tone="pod" size="sm">共有帳簿</Badge>
      </div>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-pod/12 text-pod">
              <UsersIcon size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-[14px] font-medium">{m.name}</span>
              <span className="block text-[12px] text-text-tertiary">
                {m.isOwner ? "オーナー" : m.role === "EDITOR" ? "編集可" : "閲覧のみ"}
              </span>
            </span>
            {isOwner && !m.isOwner && (
              <button
                onClick={() => kick(m.userId)}
                aria-label="メンバーを外す"
                className="grid h-8 w-8 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
              >
                <TrashIcon size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isOwner && members.length < maxMembers && (
        <div className="space-y-2 rounded-xl border border-border-subtle p-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="招待するメールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              className="w-28 shrink-0"
              value={role}
              onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
            >
              <option value="EDITOR">編集可</option>
              <option value="VIEWER">閲覧のみ</option>
            </Select>
          </div>
          <Button size="sm" onClick={invite} disabled={pending || !email}>
            <PlusIcon size={16} /> 招待する
          </Button>
          {msg && <p className="text-[13px] text-expense">{msg}</p>}
        </div>
      )}
    </div>
  );
}
