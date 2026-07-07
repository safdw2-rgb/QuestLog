"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { bindMentorStudent, getMentorStudents, unbindMentorStudent } from "@/lib/api";
import { useEditMode } from "@/components/layout/EditModeContext";
import { RpgIcon } from "@/components/rpg/RpgIcon";
import { RPG_UI } from "@/lib/rpg-assets";
import type { MentorStudent } from "@/lib/types";

interface MentorshipPanelProps {
  inviteCode: string;
  onStudentsChange?: (students: MentorStudent[]) => void;
}

export function MentorshipPanel({
  inviteCode,
  onStudentsChange,
}: MentorshipPanelProps) {
  const { editMode } = useEditMode();
  const [students, setStudents] = useState<MentorStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [bindCode, setBindCode] = useState("");
  const [binding, setBinding] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [bindSuccess, setBindSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<number | null>(null);

  const syncStudents = useCallback(
    (items: MentorStudent[]) => {
      setStudents(items);
      onStudentsChange?.(items);
    },
    [onStudentsChange],
  );

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMentorStudents();
      syncStudents(response.items);
    } catch {
      syncStudents([]);
    } finally {
      setLoading(false);
    }
  }, [syncStudents]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  async function handleCopyCode() {
    if (!inviteCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleBind(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = bindCode.trim();
    if (!code || binding) {
      return;
    }

    setBinding(true);
    setBindError(null);
    setBindSuccess(null);

    try {
      const result = await bindMentorStudent(code);
      setBindSuccess(result.message);
      setBindCode("");
      await loadStudents();
    } catch (e) {
      setBindError(
        e instanceof Error ? e.message : "Не удалось привязать ученика",
      );
    } finally {
      setBinding(false);
    }
  }

  async function handleUnbind(student: MentorStudent) {
    if (removingStudentId != null) {
      return;
    }

    const confirmed = window.confirm(
      `Отвязать ученика «${student.display_name}»? Вы потеряете доступ к его квестам.`,
    );
    if (!confirmed) {
      return;
    }

    setRemovingStudentId(student.user_id);
    setBindError(null);
    setBindSuccess(null);

    try {
      await unbindMentorStudent(student.user_id);
      await loadStudents();
    } catch (e) {
      setBindError(
        e instanceof Error ? e.message : "Не удалось отвязать ученика",
      );
    } finally {
      setRemovingStudentId(null);
    }
  }

  return (
    <section className="mt-2 p-0" aria-labelledby="mentorship-title">
      {/* Title strictly centred inside the dark plaque graphic */}
      <div className="mb-3 mentor-title-plaque">
        <h3
          id="mentorship-title"
          style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontWeight: 'bold',
            fontSize: '1rem',
            letterSpacing: '0.06em',
            color: '#fff8e7',
            textShadow: '1px 1px 2px #000',
            margin: 0,
          }}
        >
          Наставничество
        </h3>
      </div>
      <p className="mb-2 text-xs text-ink-muted">
        Поделитесь кодом с учеником или привяжите его аккаунт
      </p>

      <div className="mentorship-invite-block p-0">
        <p className="text-[10px] uppercase tracking-wide text-ink-muted">
          Ваш код приглашения
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="mentorship-code font-mono text-sm font-semibold tracking-[0.15em] text-[#3a2214]">
            {inviteCode || "—"}
          </code>
          <button
            type="button"
            className="journal-button-secondary px-3 py-1.5 text-xs"
            onClick={handleCopyCode}
            disabled={!inviteCode}
          >
            {copied ? "Скопировано ✓" : "Скопировать код"}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Передайте этот код наставнику или родителю — они смогут назначать вам
          квесты.
        </p>
      </div>

      <form className="mt-4 space-y-2" onSubmit={handleBind}>
        <label className="block">
          <span className="mb-1.5 block text-[10px] uppercase tracking-wide text-ink-muted">
            Код ученика
          </span>
          <input
            className="rpg-input-field font-mono uppercase tracking-wider"
            value={bindCode}
            onChange={(e) => {
              setBindCode(e.target.value.toUpperCase());
              setBindError(null);
              setBindSuccess(null);
            }}
            placeholder="ВСТАВЬТЕ КОД"
            maxLength={12}
            disabled={binding}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        {bindError && (
          <p className="rounded-lg border border-rose-300/50 bg-rose-50/80 px-3 py-2 text-xs text-rose-900">
            {bindError.replace(/^API \d+: /, "")}
          </p>
        )}

        {bindSuccess && (
          <p className="rounded-lg border border-emerald-300/50 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900">
            {bindSuccess}
          </p>
        )}

        <button
          type="submit"
          className="journal-button-primary w-full"
          disabled={binding || !bindCode.trim()}
        >
          {binding ? "Привязываем..." : "Привязать ученика"}
        </button>
      </form>

      <div className="mt-5 border-t border-ink/10 pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="text-xs uppercase tracking-wide text-ink-muted">
            Подопечные
          </h4>
          {!loading && (
            <span className="text-xs text-ink-muted">{students.length}</span>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-ink-muted">Загружаем список...</p>
        ) : students.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink/15 px-3 py-4 text-center text-sm text-ink-muted">
            Пока нет привязанных учеников. Введите их код выше.
          </p>
        ) : (
          <ul className="space-y-2">
            {students.map((student) => (
              <li
                key={student.user_id}
                className="mentorship-student-card flex items-center gap-3 px-0 py-2"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm"
                  aria-hidden
                >
                  🎓
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    {student.display_name}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    @{student.username}
                  </p>
                </div>
                <code className="hidden shrink-0 font-mono text-[10px] text-ink-muted sm:inline">
                  {student.invite_code}
                </code>
                {editMode && (
                  <button
                    type="button"
                    className="mentorship-unbind-button shrink-0 rounded-md border border-rose-300/50 bg-rose-50/80 p-1 transition hover:bg-rose-100/90 disabled:opacity-50"
                    onClick={() => void handleUnbind(student)}
                    disabled={removingStudentId === student.user_id}
                    title={`Отвязать ${student.display_name}`}
                    aria-label={`Отвязать ${student.display_name}`}
                  >
                    {removingStudentId === student.user_id ? (
                      "…"
                    ) : (
                      <RpgIcon
                        src={RPG_UI.deleteCross}
                        fallbackEmoji="✕"
                        alt=""
                        className="inline-block h-5 w-5 shrink-0 align-middle object-contain"
                      />
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
