"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { UsersIcon, PlusIcon, TrashIcon } from "@/components/icons";
import {
  createPod,
  inviteMember,
  removeMember,
  transferOwnership,
  leaveLedger,
  deleteLedger,
  updateMemberRole,
  revokeInvite,
} from "../actions";
import { MEMBER_ROLE_LABEL, MEMBER_ROLE_HINT, type MemberRole } from "@/lib/enums";
import { useConfirm } from "@/components/ui/confirm-dialog";

/** 招待・変更で選べる権限。オーナーは移譲でしか動かさない。 */
const ASSIGNABLE = ["EDITOR", "SELF_EDITOR", "VIEWER"] as const;
type AssignableRole = (typeof ASSIGNABLE)[number];
import { useToast } from "@/components/ui/toast";

interface Member {
  userId: string;
  name: string;
  role: string;
  isOwner: boolean;
}

export interface PendingInviteItem {
  id: string;
  email: string;
  role: string;
}

export function FamilySharing({
  ledgerId,
  ledgerName,
  isPod,
  isOwner,
  members,
  pendingInvites,
  maxMembers,
  tier,
}: {
  ledgerId: string;
  ledgerName: string;
  isPod: boolean;
  isOwner: boolean;
  members: Member[];
  pendingInvites: PendingInviteItem[];
  maxMembers: number;
  tier: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [transferTo, setTransferTo] = useState("");
  const [deleteName, setDeleteName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>();
  const [podName, setPodName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("EDITOR");

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
        toast.success("招待メールを送信しました。相手が受け取ると参加します。");
        router.refresh();
      } else setMsg(res.error);
    });
  }
  function changeRole(userId: string, next: AssignableRole) {
    setMsg(undefined);
    start(async () => {
      const res = await updateMemberRole({ ledgerId, userId, role: next });
      if (res.ok) router.refresh();
      else setMsg(res.error);
    });
  }

  function cancelInvite(inviteId: string) {
    setMsg(undefined);
    start(async () => {
      const res = await revokeInvite({ ledgerId, inviteId });
      if (res.ok) router.refresh();
      else setMsg(res.error);
    });
  }

  function kick(userId: string) {
    start(async () => {
      const res = await removeMember({ ledgerId, userId });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      router.refresh();
    });
  }

  // 確認ダイアログは start() の外で待つこと。
  // トランジション内で await すると pending が立ったまま入力待ちになり、
  // ダイアログを開く state 更新が反映されず「押しても何も起きない」になる。
  async function transfer() {
    if (!transferTo) return;
    const target = members.find((m) => m.userId === transferTo);
    setMsg(undefined);
    const ok = await confirm({
      title: `オーナーを ${target?.name ?? "選択した相手"} に譲りますか？`,
      body: "譲ったあとは、あなたは編集可のメンバーになります。",
      confirmText: "譲る",
    });
    if (!ok) return;
    start(async () => {
      const res = await transferOwnership({ ledgerId, toUserId: transferTo });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      toast.success("オーナーを譲りました");
      setTransferTo("");
      router.refresh();
    });
  }

  async function leave() {
    setMsg(undefined);
    const ok = await confirm({
      title: "この帳簿から抜けますか？",
      body: "あなたが記録した内容は帳簿に残ります。再び参加するには招待が必要です。",
      confirmText: "抜ける",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await leaveLedger({ ledgerId });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      toast.success("帳簿から抜けました");
      router.refresh();
    });
  }

  function removeLedger() {
    setMsg(undefined);
    start(async () => {
      const res = await deleteLedger({ ledgerId, confirmName: deleteName });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      toast.success("帳簿を削除しました");
      setDeleting(false);
      setDeleteName("");
      router.refresh();
    });
  }

  // プラン制限がかかるのは「共有帳簿を作ること」であって、参加すること自体ではない。
  // 招待された側が FREE でもメンバー一覧や退出は使えないと、抜ける手段が
  // 退会しか無くなってしまう。
  if (tier === "FREE" && !isPod) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-4">
        <UsersIcon size={22} className="text-pod" />
        <span className="flex-1 text-[14px] text-text-secondary">
          ファミリー共有はプラス以上で利用いただけます。
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
            aria-label="共有帳簿の名前"
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
            <span className="tap-target grid h-9 w-9 place-items-center rounded-full bg-pod/12 text-pod">
              <UsersIcon size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-[14px] font-medium">{m.name}</span>
              <span className="block text-[12px] text-text-tertiary">
                {m.isOwner
                  ? MEMBER_ROLE_LABEL.OWNER
                  : (MEMBER_ROLE_LABEL[m.role as MemberRole] ?? m.role)}
              </span>
            </span>
            {isOwner && !m.isOwner && (
              <>
                {/* 招待時にしか決められなかった権限を、あとからでも変えられるようにする。 */}
                <select
                  value={ASSIGNABLE.includes(m.role as AssignableRole) ? m.role : "EDITOR"}
                  onChange={(e) => changeRole(m.userId, e.target.value as AssignableRole)}
                  disabled={pending}
                  aria-label={`${m.name} の権限`}
                  className="h-11 max-w-[11rem] rounded-lg border border-border-subtle bg-surface-1 px-2 text-[13px]"
                >
                  {ASSIGNABLE.map((r) => (
                    <option key={r} value={r}>
                      {MEMBER_ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => kick(m.userId)}
                  aria-label={`${m.name} をメンバーから外す`}
                  className="tap-target grid h-8 w-8 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
                >
                  <TrashIcon size={16} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <div className="text-[13px] font-medium text-text-secondary">送信済みの招待</div>
          {pendingInvites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 rounded-xl border border-dashed border-border-subtle px-3 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px]">{inv.email}</span>
                <span className="block text-[12px] text-text-tertiary">
                  返事待ち ・ {inv.role === "VIEWER" ? "閲覧のみ" : "編集可"}
                </span>
              </span>
              {isOwner && (
                <button
                  onClick={() => cancelInvite(inv.id)}
                  disabled={pending}
                  className="text-[12px] font-medium text-text-secondary hover:text-expense"
                >
                  取り消す
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && members.length + pendingInvites.length < maxMembers && (
        <div className="space-y-2 rounded-xl border border-border-subtle p-3">
          <div className="flex gap-2">
            <Input
              type="email"
              aria-label="招待するメールアドレス"
              placeholder="招待するメールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              className="w-40 shrink-0"
              aria-label="招待する相手の権限"
              value={role}
              onChange={(e) => setRole(e.target.value as AssignableRole)}
            >
              {ASSIGNABLE.map((r) => (
                <option key={r} value={r}>
                  {MEMBER_ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-[12px] leading-relaxed text-text-tertiary">
            {MEMBER_ROLE_HINT[role]}
          </p>
          <Button size="sm" onClick={invite} disabled={pending || !email}>
            <PlusIcon size={16} /> 招待する
          </Button>
        </div>
      )}

      {/* オーナー移譲。ownerId と role の両方が同時に動くため、
          「譲る」以外の経路でオーナーが変わることはない。 */}
      {isOwner && members.length > 1 && (
        <div className="space-y-2 rounded-xl border border-border-subtle p-3">
          <div className="text-[14px] font-medium">オーナーを譲る</div>
          <p className="text-[13px] text-text-secondary">
            譲ったあとは、あなたは編集可のメンバーになります。
          </p>
          <div className="flex gap-2">
            <Select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              aria-label="オーナーを譲る相手"
            >
              <option value="">譲る相手を選ぶ</option>
              {members
                .filter((m) => !m.isOwner)
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
            </Select>
            <Button
              size="sm"
              variant="gray"
              onClick={transfer}
              disabled={pending || !transferTo}
              className="shrink-0"
            >
              譲る
            </Button>
          </div>
        </div>
      )}

      {/* オーナーでないメンバーは自分で抜けられる。
          これが無いと、抜ける唯一の手段が退会になってしまう。 */}
      {!isOwner && (
        <Button variant="ghost" size="sm" className="text-expense" onClick={leave} disabled={pending}>
          この帳簿から抜ける
        </Button>
      )}

      {isOwner &&
        (deleting ? (
          <div className="space-y-3 rounded-xl border border-expense/30 bg-expense/5 p-4">
            <p className="text-[13px] text-text-secondary">
              この帳簿の取引・サブスク・予算・目標がすべて削除されます。メンバー全員から見えなくなり、元に戻せません。
            </p>
            <div>
              <p className="mb-1.5 text-[13px] text-text-secondary">
                確認のため <b className="text-text-primary">{ledgerName}</b> と入力してください。
              </p>
              <Input
                value={deleteName}
                onChange={(e) => setDeleteName(e.target.value)}
                aria-label={`確認のため帳簿名 ${ledgerName} を入力`}
                placeholder={ledgerName}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={removeLedger}
                disabled={pending || deleteName.trim() !== ledgerName}
              >
                {pending ? "削除中…" : "完全に削除する"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDeleting(false);
                  setDeleteName("");
                }}
                disabled={pending}
              >
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-expense"
            onClick={() => setDeleting(true)}
            disabled={pending}
          >
            この帳簿を削除
          </Button>
        ))}

      {msg && (
        <p role="alert" className="text-[13px] text-expense">
          {msg}
        </p>
      )}
    </div>
  );
}
