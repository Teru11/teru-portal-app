"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  Gamepad2,
  Menu,
  Pencil,
  Save,
  Search,
  Swords,
  X,
} from "lucide-react";

type Character = {
  id: number;
  name: string;
  nickname: string;
  note: string | null;
  is_registered: boolean;
};

type StrategyNote = {
  id: number;
  my_character_id: number;
  target_character_id: number;
  target_name: string;
  target_nickname: string;
  content: string;
  youtube_url: string | null;
  updated_at: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !result.success || result.data === undefined) {
    throw new Error(result.error?.message ?? "通信に失敗しました。");
  }
  return result.data;
}

function FighterPortrait({ character, size = "normal" }: { character: Character; size?: "normal" | "large" }) {
  return (
    <span className={`fighter-portrait fighter-portrait--${size}`}>
      <Image
        src={`/characters/${character.id}.png`}
        alt=""
        width={size === "large" ? 84 : 54}
        height={size === "large" ? 84 : 54}
        onError={(event) => {
          event.currentTarget.style.visibility = "hidden";
        }}
      />
    </span>
  );
}

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [myCharacterId, setMyCharacterId] = useState<number | null>(null);
  const [targetCharacterId, setTargetCharacterId] = useState<number | null>(null);
  const [notes, setNotes] = useState<StrategyNote[]>([]);
  const [notesCharacterId, setNotesCharacterId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ noteId: number | null; content: string; url: string }>({ noteId: null, content: "", url: "" });
  const [search, setSearch] = useState("");
  const [myFighterSearch, setMyFighterSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [onlyRegistered, setOnlyRegistered] = useState(false);
  const [directoryVisible, setDirectoryVisible] = useState(true);
  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);
  const [characterDraft, setCharacterDraft] = useState({ nickname: "", note: "", isRegistered: false });
  const [savingCharacterId, setSavingCharacterId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeNotes = notesCharacterId === myCharacterId ? notes : [];
  const registeredCharacters = characters.filter((character) => character.is_registered);
  const selectedCharacter = characters.find((character) => character.id === myCharacterId);
  const selectedNote = activeNotes.find((note) => note.target_character_id === targetCharacterId);
  const targetCharacter = selectedNote && characters.find((character) => character.id === targetCharacterId);
  const draftContent = selectedNote && draft.noteId === selectedNote.id ? draft.content : selectedNote?.content ?? "";
  const draftUrl = selectedNote && draft.noteId === selectedNote.id ? draft.url : selectedNote?.youtube_url ?? "";
  const visibleCharacters = characters.filter((character) => {
    const query = search.trim().toLocaleLowerCase("ja");
    return (!onlyRegistered || character.is_registered)
      && (!query || character.nickname.toLocaleLowerCase("ja").includes(query));
  });
  const visibleMyFighters = registeredCharacters.filter((character) =>
    character.nickname.toLocaleLowerCase("ja").includes(myFighterSearch.trim().toLocaleLowerCase("ja")),
  );
  const visibleTargetNotes = activeNotes.filter((note) =>
    note.target_nickname.toLocaleLowerCase("ja").includes(targetSearch.trim().toLocaleLowerCase("ja")),
  );

  async function refreshCharacters() {
    const result = await requestApi<Character[]>("/api/sumabura/characters");
    setCharacters(result);
    return result;
  }

  useEffect(() => {
    let active = true;
    requestApi<Character[]>("/api/sumabura/characters")
      .then((result) => {
        if (!active) return;
        setCharacters(result);
        setMyCharacterId(result.find((character) => character.is_registered)?.id ?? null);
      })
      .catch((error: unknown) => {
        if (active) setNotice({ kind: "error", message: error instanceof Error ? error.message : "ファイターを取得できませんでした。" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (myCharacterId === null) return;

    let active = true;
    requestApi<StrategyNote[]>(`/api/sumabura/strategy-notes?my_character_id=${myCharacterId}`)
      .then((result) => {
        if (!active) return;
        setNotes(result);
        setNotesCharacterId(myCharacterId);
        setTargetCharacterId((current) =>
          current !== null && result.some((note) => note.target_character_id === current)
            ? current
            : result[0]?.target_character_id ?? null,
        );
      })
      .catch((error: unknown) => {
        if (active) setNotice({ kind: "error", message: error instanceof Error ? error.message : "対策メモを取得できませんでした。" });
      });
    return () => {
      active = false;
    };
  }, [myCharacterId]);

  async function saveNote() {
    if (myCharacterId === null || targetCharacterId === null || !selectedNote) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await requestApi<StrategyNote>("/api/sumabura/strategy-notes", {
        method: "PUT",
        body: JSON.stringify({
          my_character_id: myCharacterId,
          target_character_id: targetCharacterId,
          content: draftContent,
          youtube_url: draftUrl.trim() || null,
        }),
      });
      setNotes((current) => current.map((note) => note.target_character_id === targetCharacterId ? updated : note));
      setNotice({ kind: "success", message: "対策メモを保存しました。" });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "保存に失敗しました。" });
    } finally {
      setSaving(false);
    }
  }

  function beginCharacterEdit(character: Character) {
    setEditingCharacterId(character.id);
    setCharacterDraft({ nickname: character.nickname, note: character.note ?? "", isRegistered: character.is_registered });
  }

  async function saveCharacter(character: Character) {
    const nickname = characterDraft.nickname.trim();
    const note = characterDraft.note || null;
    if (!nickname || nickname.length > 20) {
      setNotice({ kind: "error", message: "略称は1〜20文字で入力してください。" });
      return;
    }

    const nicknameChanged = nickname !== character.nickname;
    const noteChanged = note !== character.note;
    const registrationChanged = characterDraft.isRegistered !== character.is_registered;
    if (!nicknameChanged && !noteChanged && !registrationChanged) {
      setEditingCharacterId(null);
      return;
    }

    setSavingCharacterId(character.id);
    setNotice(null);
    try {
      await requestApi<Character>("/api/sumabura/characters", {
        method: "PUT",
        body: JSON.stringify({
          id: character.id,
          nickname,
          note,
          is_registered: characterDraft.isRegistered,
        }),
      });
      const updated = await refreshCharacters();
      if (myCharacterId === character.id && !characterDraft.isRegistered) {
        setMyCharacterId(updated.find((item) => item.is_registered)?.id ?? null);
      } else if (myCharacterId === null && characterDraft.isRegistered) {
        setMyCharacterId(character.id);
      }
      setEditingCharacterId(null);
      setNotice({ kind: "success", message: `${character.name}のファイター情報を更新しました。` });
    } catch (error) {
      try {
        await refreshCharacters();
      } catch {
        setNotice({ kind: "error", message: "更新に失敗し、最新のファイター情報も取得できませんでした。" });
      }
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "ファイター情報の更新に失敗しました。" });
    } finally {
      setSavingCharacterId(null);
    }
  }

  return (
    <div className={`portal-shell${sidebarOpen ? "" : " portal-shell--sidebar-closed"}`}>
      <header className="topbar">
        <div className="topbar-brand">
          <button className="icon-button sidebar-toggle" type="button" aria-label="メニューを切り替え" onClick={() => setSidebarOpen((open) => !open)}>
            {sidebarOpen ? <Menu size={19} /> : <ChevronRight size={19} />}
          </button>
          <span className="brand-mark"><Gamepad2 size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">teru-portal</span>
        </div>
      </header>

      <div className="portal-body">
        <aside className="sidebar" aria-label="メインメニュー">
          <div className="sidebar-section-label">WORKSPACE</div>
          <button className="nav-item nav-item--active" type="button" title="スマブラ">
            <Swords size={18} /><span>スマブラ</span><span className="nav-active-mark" />
          </button>
          <div className="sidebar-bottom"><span className="sidebar-avatar">T</span><span className="sidebar-user">ローカル利用</span><CircleHelp size={16} /></div>
        </aside>

        <main className="main-content">
          <div className="page-heading">
            <div className="heading-row">
              <h1>スマブラ</h1>
              <button className="directory-toggle" type="button" aria-expanded={directoryVisible} onClick={() => setDirectoryVisible((visible) => !visible)}>
                {directoryVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                ファイター一覧 {directoryVisible ? "非表示" : "表示"}
              </button>
            </div>
          </div>

          {notice && (
            <div className={`notice notice--${notice.kind}`} role="status">
              {notice.kind === "error" ? <AlertCircle size={19} /> : <Check size={19} />}
              <span>{notice.message}</span>
              <button className="notice-close" type="button" aria-label="通知を閉じる" onClick={() => setNotice(null)}><X size={17} /></button>
            </div>
          )}

          <div className="feature-columns">
          <section className="section-block" aria-labelledby="my-fighters-title">
            <div className="section-heading">
              <div className="section-title-wrap"><div><h2 id="my-fighters-title">使用ファイター選択</h2></div></div>
            </div>
            <div className="my-fighters-panel">
              <label className="list-filter"><Search size={15} /><input value={myFighterSearch} onChange={(event) => setMyFighterSearch(event.target.value)} placeholder="略称で絞り込み..." aria-label="使用ファイターを略称で絞り込み" /></label>
              <div className="my-fighter-list">
                {visibleMyFighters.map((character) => <button className={`my-fighter${character.id === myCharacterId ? " my-fighter--selected" : ""}`} type="button" onClick={() => setMyCharacterId(character.id)} aria-pressed={character.id === myCharacterId} key={character.id}>
                  <FighterPortrait character={character} />
                  <span className="my-fighter-name">{character.name}</span>
                  <span className="my-fighter-note" title={character.note ?? ""}>{character.note || "—"}</span>
                </button>)}
                {!loading && registeredCharacters.length === 0 && <p className="empty-inline">まだ使用ファイターが登録されていません。</p>}
                {registeredCharacters.length > 0 && visibleMyFighters.length === 0 && <p className="empty-inline">一致する使用ファイターがいません。</p>}
              </div>
            </div>
          </section>

          <section className="section-block" aria-labelledby="matchup-title">
            <div className="section-heading">
              <div className="section-title-wrap"><div><h2 id="matchup-title">対策対象ファイター</h2></div></div>
              {selectedCharacter && <span className="active-fighter-label"><span>MY FIGHTER</span>{selectedCharacter.name}<ChevronDown size={13} /></span>}
            </div>

            <div className="matchup-layout">
              <div className="target-panel">
                <div className="target-picker">
                  <label className="list-filter target-filter"><Search size={15} /><input value={targetSearch} onChange={(event) => setTargetSearch(event.target.value)} placeholder="略称で絞り込み..." aria-label="対策対象を略称で絞り込み" /></label>
                  {targetSearch.trim() && <div className="target-results" role="listbox" aria-label="検索結果">
                    {visibleTargetNotes.map((note) => {
                    const character = characters.find((item) => item.id === note.target_character_id);
                    if (!character) return null;
                    return <button className="target-result" type="button" role="option" aria-selected={character.id === targetCharacterId} onClick={() => {
                      setTargetCharacterId(character.id);
                      setTargetSearch("");
                    }} key={character.id}>
                      <FighterPortrait character={character} />
                      <span className="target-row-name">{character.name}<small>{character.nickname}</small></span>
                    </button>;
                  })}
                    {!loading && visibleTargetNotes.length === 0 && <div className="target-results-empty">一致するファイターがいません。</div>}
                    {loading && <div className="target-results-empty">ファイターを読み込み中...</div>}
                  </div>}
                </div>
              </div>

              <div className="editor-panel">
                {targetCharacter ? <>
                  <div className="editor-heading">
                    <FighterPortrait character={targetCharacter} size="large" />
                    <div className="editor-fighter-name"><h3>{targetCharacter.name}</h3></div>
                    <span className="editor-card-icon"><Swords size={17} /></span>
                  </div>
                  <label className="field-label" htmlFor="strategy-content">対策メモ</label>
                  <textarea id="strategy-content" className="strategy-textarea" value={draftContent} onChange={(event) => selectedNote && setDraft({ noteId: selectedNote.id, content: event.target.value, url: draftUrl })} placeholder="立ち回り、警戒する技、確定反撃など..." disabled={!selectedNote} />
                  <label className="field-label youtube-label" htmlFor="youtube-url">YouTube URL</label>
                  <div className="url-field"><span className="youtube-play">▶</span><input id="youtube-url" type="url" value={draftUrl} onChange={(event) => selectedNote && setDraft({ noteId: selectedNote.id, content: draftContent, url: event.target.value })} placeholder="https://www.youtube.com/..." disabled={!selectedNote} /></div>
                  <div className="editor-footer editor-footer--actions"><button className="button button--primary" type="button" onClick={() => void saveNote()} disabled={!selectedNote || saving}><Save size={16} />{saving ? "保存中..." : "変更を保存"}</button></div>
                </> : <div className="editor-empty"><span className="editor-empty-icon"><Swords size={22} /></span><p>対策対象を選択</p><span>左の一覧からファイターを選ぶと、メモを編集できます。</span></div>}
              </div>
            </div>
          </section>

          <section className="section-block directory-section" aria-label="ファイター一覧">
            {directoryVisible && <div className="section-heading section-heading--directory">
              <div className="directory-title-row">
                <div className="section-title-wrap"><div><h2 id="directory-title">ファイター一覧</h2></div></div>
              </div>
            </div>}
            {directoryVisible && <>
              <div className="directory-controls">
                <label className="directory-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="略称で絞り込み..." aria-label="ファイターを略称で検索" />{search && <button type="button" onClick={() => setSearch("")} aria-label="検索をクリア"><X size={14} /></button>}</label>
                <label className="registered-filter"><input type="checkbox" checked={onlyRegistered} onChange={(event) => setOnlyRegistered(event.target.checked)} /><span>使用キャラのみ表示</span></label>
              </div>
              <div className="directory-table-wrap">
                <table className="fighter-table">
                  <thead><tr><th>ID</th><th>ファイター名</th><th>略称</th><th>使用</th><th>説明</th><th>編集</th></tr></thead>
                  <tbody>
                    {visibleCharacters.map((character) => {
                      const isEditing = editingCharacterId === character.id;
                      return <tr className={`${character.is_registered ? "fighter-table-row--registered" : ""}${character.id === targetCharacterId ? " fighter-table-row--target" : ""}`} key={character.id}>
                        <td className="fighter-id">{character.id}</td>
                        <td><button className="table-fighter-name" type="button" onClick={() => {
                          if (activeNotes.some((note) => note.target_character_id === character.id)) setTargetCharacterId(character.id);
                        }}><FighterPortrait character={character} /><span>{character.name}</span></button></td>
                        <td>{isEditing ? <input className="table-edit-input" value={characterDraft.nickname} maxLength={20} onChange={(event) => setCharacterDraft((current) => ({ ...current, nickname: event.target.value }))} aria-label={`${character.name}の略称`} /> : <span className="table-nickname">{character.nickname}</span>}</td>
                        <td>{isEditing ? <input className="table-registration-input" type="checkbox" checked={characterDraft.isRegistered} onChange={(event) => setCharacterDraft((current) => ({ ...current, isRegistered: event.target.checked }))} aria-label={`${character.name}の使用キャラ設定`} /> : character.is_registered ? <span className="registered-check" title="使用キャラ"><Check size={15} /></span> : <span className="not-registered" />}</td>
                        <td className="table-note-cell">{isEditing ? <textarea className="table-edit-note" value={characterDraft.note} onChange={(event) => setCharacterDraft((current) => ({ ...current, note: event.target.value }))} aria-label={`${character.name}の説明`} /> : <span title={character.note ?? ""}>{character.note || "—"}</span>}</td>
                        <td>{isEditing ? <span className="table-edit-actions"><button className="table-save" type="button" onClick={() => void saveCharacter(character)} disabled={savingCharacterId === character.id} aria-label="ファイター情報を更新"><Save size={15} /></button><button className="table-cancel" type="button" onClick={() => setEditingCharacterId(null)} aria-label="編集をキャンセル"><X size={15} /></button></span> : <button className="table-edit-button" type="button" onClick={() => beginCharacterEdit(character)} aria-label={`${character.name}を編集`} title="編集"><Pencil size={15} /></button>}</td>
                      </tr>;
                    })}
                    {visibleCharacters.length === 0 && <tr><td colSpan={6} className="table-empty">一致するファイターがいません。</td></tr>}
                  </tbody>
                </table>
              </div>
            </>}
          </section>
          </div>

          <footer className="page-footer"><span>TERU PORTAL <span>·</span> SUMABURA NOTEBOOK</span><span>LOCAL WORKSPACE</span></footer>
        </main>
      </div>
    </div>
  );
}
